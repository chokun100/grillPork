import { Hono } from 'hono'
import { dualAuth, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { calculateBillPricing, calculateWeekendPromotion, getCurrentDayOfWeek } from '../lib/calculations'
import { validateOpenBillRequest, validatePayCashRequest } from '../lib/validation'
import { generateTableQRCode } from '../lib/qr'
import promptpayQR from 'promptpay-qr'

const bills = new Hono()

bills.use('*', errorHandler)

// Get all bills
bills.get('/',
  dualAuth,
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const bills = await prisma.bill.findMany({
        include: {
          table: {
            select: {
              code: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              loyaltyStamps: true
            }
          },
          openedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          closedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          openedAt: 'desc'
        }
      })

      return c.json({ ok: true, data: bills })
    } catch (error) {
      console.error('Get bills error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bills'
        }
      }, 500)
    }
  }
)

// Get bill by ID
bills.get('/:id',
  dualAuth,
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          table: {
            select: {
              code: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              loyaltyStamps: true
            }
          },
          openedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          closedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })

      if (!bill) {
        return c.json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Bill not found'
          }
        }, 404)
      }

      return c.json({ ok: true, data: bill })
    } catch (error) {
      console.error('Get bill error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bill'
        }
      }, 500)
    }
  }
)

// Update bill (head counts, discount, customer)
bills.patch('/:id',
  dualAuth,
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      const body = await c.req.json()

      // Get current bill
      const currentBill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          table: true,
          customer: true
        }
      })

      if (!currentBill) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Bill not found' 
          } 
        }, 404)
      }

      if (currentBill.status !== 'OPEN') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STATE', 
            message: 'Cannot update closed or void bill' 
          } 
        }, 400)
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

      // Calculate new pricing
      const adultCount = body.adultCount ?? currentBill.adultCount
      const childCount = body.childCount ?? currentBill.childCount
      const discountType = body.discountType ?? currentBill.discountType
      const discountValue = new Decimal(body.discountValue ?? currentBill.discountValue)
      const customerId = body.customerId ?? currentBill.customerId

      // Check for valid discount types
      if (!['NONE', 'PERCENT', 'AMOUNT'].includes(discountType)) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid discount type' 
          } 
        }, 400)
      }

      // Calculate promotion discount if applicable
      let promotionDiscount = new Decimal(0)
      let promoApplied = null

      if (!currentBill.loyaltyFreeApplied) {
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
      }

      // Calculate pricing
      const pricingResult = calculateBillPricing({
        adultCount,
        childCount,
        adultPriceGross: settings.adultPriceGross,
        vatRate: settings.vatRate,
        discountType: discountType as 'NONE' | 'PERCENT' | 'AMOUNT',
        discountValue,
        promotionDiscount,
        loyaltyFreeApplied: currentBill.loyaltyFreeApplied
      })

      // Update bill
      const updatedBill = await prisma.bill.update({
        where: { id: billId },
        data: {
          adultCount,
          childCount,
          adultPriceGross: settings.adultPriceGross,
          discountType: discountType as any,
          discountValue,
          promoApplied,
          subtotalGross: pricingResult.subtotalGross,
          vatAmount: pricingResult.vatAmount,
          totalGross: pricingResult.totalGross,
          customerId
        },
        include: {
          table: {
            select: {
              code: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              loyaltyStamps: true
            }
          }
        }
      })

      return c.json({ ok: true, data: updatedBill })
    } catch (error) {
      console.error('Update bill error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update bill' 
        } 
      }, 500)
    }
  }
)

// Apply weekend promotion
bills.post('/:id/apply-promo',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          table: true
        }
      })

      if (!bill) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Bill not found' 
          } 
        }, 404)
      }

      if (bill.status !== 'OPEN') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STATE', 
            message: 'Cannot apply promotion to closed or void bill' 
          } 
        }, 400)
      }

      if (bill.loyaltyFreeApplied) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STATE', 
            message: 'Cannot apply promotion when loyalty free is already applied' 
          } 
        }, 400)
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

      // Check for active promotions
      const activePromotions = await prisma.promotion.findMany({
        where: { 
          active: true,
          daysOfWeek: { has: getCurrentDayOfWeek() }
        }
      })

      if (activePromotions.length === 0) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NO_PROMOTION', 
            message: 'No active promotions available today' 
          } 
        }, 400)
      }

      const promotion = activePromotions[0]
      const baseAmount = new Decimal(bill.adultCount).mul(settings.adultPriceGross)
      
      let promotionDiscount = new Decimal(0)
      if (promotion.type === 'PERCENT') {
        promotionDiscount = baseAmount.mul(promotion.value).div(100)
      } else if (promotion.type === 'AMOUNT') {
        promotionDiscount = promotion.value
      }

      // Recalculate pricing with promotion
      const pricingResult = calculateBillPricing({
        adultCount: bill.adultCount,
        childCount: bill.childCount,
        adultPriceGross: settings.adultPriceGross,
        vatRate: settings.vatRate,
        discountType: bill.discountType as 'NONE' | 'PERCENT' | 'AMOUNT',
        discountValue: bill.discountValue,
        promotionDiscount,
        loyaltyFreeApplied: bill.loyaltyFreeApplied
      })

      // Update bill
      const updatedBill = await prisma.bill.update({
        where: { id: billId },
        data: {
          promoApplied: promotion.key,
          subtotalGross: pricingResult.subtotalGross,
          vatAmount: pricingResult.vatAmount,
          totalGross: pricingResult.totalGross
        }
      })

      return c.json({ 
        ok: true, 
        data: {
          bill: updatedBill,
          promotionApplied: promotion.name,
          discountAmount: promotionDiscount
        }
      })
    } catch (error) {
      console.error('Apply promotion error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to apply promotion' 
        } 
      }, 500)
    }
  }
)

// Apply loyalty redemption
bills.post('/:id/apply-loyalty',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          customer: true
        }
      })

      if (!bill) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Bill not found' 
          } 
        }, 404)
      }

      if (bill.status !== 'OPEN') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STATE', 
            message: 'Cannot apply loyalty to closed or void bill' 
          } 
        }, 400)
      }

      if (!bill.customer) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NO_CUSTOMER', 
            message: 'No customer associated with this bill' 
          } 
        }, 400)
      }

      if (bill.loyaltyFreeApplied) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'ALREADY_APPLIED', 
            message: 'Loyalty free already applied to this bill' 
          } 
        }, 400)
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

      // Check loyalty eligibility
      if (bill.customer.loyaltyStamps < 10) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INSUFFICIENT_STAMPS', 
            message: `Customer needs 10 stamps to redeem. Current: ${bill.customer.loyaltyStamps}` 
          } 
        }, 400)
      }

      // Apply loyalty free (1 adult head free)
      const pricingResult = calculateBillPricing({
        adultCount: bill.adultCount,
        childCount: bill.childCount,
        adultPriceGross: settings.adultPriceGross,
        vatRate: settings.vatRate,
        discountType: bill.discountType as 'NONE' | 'PERCENT' | 'AMOUNT',
        discountValue: bill.discountValue,
        promotionDiscount: new Decimal(0),
        loyaltyFreeApplied: true
      })

      // Update customer stamps and bill
      const [updatedCustomer, updatedBill] = await prisma.$transaction([
        prisma.customer.update({
          where: { id: bill.customer.id },
          data: { loyaltyStamps: bill.customer.loyaltyStamps - 10 }
        }),
        prisma.bill.update({
          where: { id: billId },
          data: {
            loyaltyFreeApplied: true,
            subtotalGross: pricingResult.subtotalGross,
            vatAmount: pricingResult.vatAmount,
            totalGross: pricingResult.totalGross
          }
        })
      ])

      return c.json({ 
        ok: true, 
        data: {
          bill: updatedBill,
          customer: updatedCustomer,
          freeAmount: settings.adultPriceGross,
          stampsRedeemed: 10
        }
      })
    } catch (error) {
      console.error('Apply loyalty error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to apply loyalty' 
        } 
      }, 500)
    }
  }
)

// Record cash payment and close bill
bills.post('/:id/pay',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      const body = await c.req.json()
      
      // Validate payment request
      const validation = validatePayCashRequest(body)
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

      const { amount } = body

      // Get current bill
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          customer: true,
          table: true
        }
      })

      if (!bill) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Bill not found' 
          } 
        }, 404)
      }

      if (bill.status !== 'OPEN') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STATE', 
            message: 'Cannot pay for closed or void bill' 
          } 
        }, 400)
      }

      if (amount < bill.totalGross.toNumber()) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INSUFFICIENT_PAYMENT', 
            message: `Payment amount ${amount} is less than total ${bill.totalGross}` 
          } 
        }, 400)
      }

      const change = new Decimal(amount).sub(bill.totalGross)

      // Update bill and table status
      const [updatedBill, updatedTable] = await prisma.$transaction([
        prisma.bill.update({
          where: { id: billId },
          data: {
            status: 'CLOSED',
            paidAmount: amount,
            paymentMethod: 'CASH',
            closedAt: new Date()
          }
        }),
        prisma.table.update({
          where: { id: bill.table.id },
          data: { 
            status: 'AVAILABLE',
            currentBillId: null
          }
        })
      ])

      // Update customer loyalty stamps if applicable
      if (bill.customer && !bill.loyaltyFreeApplied) {
        await prisma.customer.update({
          where: { id: bill.customer.id },
          data: { loyaltyStamps: bill.customer.loyaltyStamps + 1 }
        })
      }

      // Generate print slip URL (placeholder)
      const printSlipUrl = `/api/bills/${billId}/slip`

      return c.json({ 
        ok: true, 
        data: {
          status: 'CLOSED',
          change: change,
          paidAmount: amount,
          totalAmount: bill.totalGross,
          printSlipUrl
        }
      })
    } catch (error) {
      console.error('Process payment error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to process payment' 
        } 
      }, 500)
    }
  }
)

// Void a bill (admin only)
bills.post('/:id/void',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const billId = c.req.param('id')
      
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          table: true
        }
      })

      if (!bill) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Bill not found' 
          } 
        }, 404)
      }

      // Update bill and table status
      const [updatedBill, updatedTable] = await prisma.$transaction([
        prisma.bill.update({
          where: { id: billId },
          data: {
            status: 'VOID',
            closedAt: new Date()
          }
        }),
        prisma.table.update({
          where: { id: bill.table.id },
          data: { 
            status: 'AVAILABLE',
            currentBillId: null
          }
        })
      ])

      return c.json({ ok: true, data: updatedBill })
    } catch (error) {
      console.error('Void bill error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to void bill' 
        } 
      }, 500)
    }
  }
)

export default bills