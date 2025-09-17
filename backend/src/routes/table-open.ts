import { Hono } from 'hono'
import { validateApiKey, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { calculateBillPricing, getCurrentDayOfWeek } from '../lib/calculations'
import { validateOpenBillRequest } from '../lib/validation'
import { generateTableQRCode } from '../lib/qr'

const tableOpen = new Hono()

tableOpen.use('*', validateApiKey)
tableOpen.use('*', errorHandler)

// Open a bill for a table
tableOpen.post('/tables/:tableId/open',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const tableId = c.req.param('tableId')
      const body = await c.req.json()
      const user = c.get('user')
      
      // Validate request
      const validation = validateOpenBillRequest(body)
      if (!validation.isValid) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Validation failed',
            details: validation.errors
          } 
        }, 400)
      }

      const { adultCount, childCount, customerPhone } = body

      // Check table exists and is available
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: {
          currentBill: true
        }
      })

      if (!table) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Table not found' 
          } 
        }, 404)
      }

      if (table.status !== 'AVAILABLE') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'TABLE_OCCUPIED', 
            message: 'Table is not available' 
          } 
        }, 409)
      }

      // Get settings
      const settings = await prisma.settings.findUnique({
        where: { id: 'singleton' }
      })

      if (!settings) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Settings not found' 
          } 
        }, 500)
      }

      // Handle customer lookup or creation
      let customerId = null
      if (customerPhone) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { phone: customerPhone }
        })

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          // Create new customer
          const newCustomer = await prisma.customer.create({
            data: {
              phone: customerPhone,
              name: null,
              loyaltyStamps: 0
            }
          })
          customerId = newCustomer.id
        }
      }

      // Calculate pricing with weekend promotion check
      let promotionDiscount = new Decimal(0)
      let promoApplied = null

      // Check for active promotions (weekend discount)
      const activePromotions = await prisma.promotion.findMany({
        where: { 
          active: true,
          daysOfWeek: { has: getCurrentDayOfWeek() }
        }
      })

      if (activePromotions.length > 0) {
        const promotion = activePromotions[0]
        const baseAmount = new Decimal(adultCount).mul(settings.adultPriceGross)
        
        if (promotion.type === 'PERCENT') {
          promotionDiscount = baseAmount.mul(promotion.value).div(100)
        } else if (promotion.type === 'AMOUNT') {
          promotionDiscount = promotion.value
        }
        
        promoApplied = promotion.key
      }

      // Calculate pricing
      const pricingResult = calculateBillPricing({
        adultCount,
        childCount,
        adultPriceGross: settings.adultPriceGross,
        vatRate: settings.vatRate,
        discountType: 'NONE',
        discountValue: new Decimal(0),
        promotionDiscount,
        loyaltyFreeApplied: false
      })

      // Create bill
      const newBill = await prisma.bill.create({
        data: {
          tableId,
          openedById: user.id,
          customerId,
          status: 'OPEN',
          adultCount,
          childCount,
          adultPriceGross: settings.adultPriceGross,
          discountType: 'NONE',
          discountValue: new Decimal(0),
          promoApplied,
          loyaltyFreeApplied: false,
          subtotalGross: pricingResult.subtotalGross,
          vatAmount: pricingResult.vatAmount,
          totalGross: pricingResult.totalGross,
          paidAmount: new Decimal(0),
          paymentMethod: null,
          notes: null
        }
      })

      // Update table status and set current bill
      const updatedTable = await prisma.table.update({
        where: { id: tableId },
        data: { 
          status: 'OCCUPIED',
          currentBillId: newBill.id
        }
      })

      // Generate QR code for table check-in
      const baseUrl = `${c.req.url.split('/api')[0]}/api`
      const { qrData, checkinUrl } = generateTableQRCode(
        updatedTable.code,
        updatedTable.qrSecret,
        baseUrl
      )

      return c.json({ 
        ok: true, 
        data: {
          bill: newBill,
          table: {
            id: updatedTable.id,
            code: updatedTable.code,
            name: updatedTable.name,
            status: updatedTable.status
          },
          qrCheckin: checkinUrl,
          pricing: {
            adultCount,
            childCount,
            adultPriceGross: settings.adultPriceGross,
            promotionApplied: promoApplied,
            subtotalGross: pricingResult.subtotalGross,
            vatAmount: pricingResult.vatAmount,
            totalGross: pricingResult.totalGross
          }
        }
      })
    } catch (error) {
      console.error('Open table bill error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to open bill for table' 
        } 
      }, 500)
    }
  }
)

export default tableOpen