import { Hono } from 'hono'
import { dualAuth, requireScopes, validateJwtToken } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { generateTableCode, generateQRSecret, generateTableQRCode } from '../lib/qr'
import { validateTable, validateOpenBillRequest } from '../lib/validation'
import { calculateBillPricing } from '../lib/calculations'
import { Decimal } from '@prisma/client/runtime/library'

const tables = new Hono()

tables.use('*', errorHandler)

// Get all tables
tables.get('/',
  dualAuth,
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const allTables = await prisma.table.findMany({
        include: {
          currentBill: {
            select: {
              id: true,
              status: true,
              adultCount: true,
              childCount: true,
              openedAt: true
            }
          }
        },
        orderBy: { code: 'asc' }
      })

      return c.json({ 
        ok: true, 
        data: allTables.map(table => ({
          id: table.id,
          code: table.code,
          name: table.name,
          status: table.status,
          currentBillId: table.currentBillId,
          currentBill: table.currentBill,
          qrSecret: table.qrSecret,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt
        }))
      })
    } catch (error) {
      console.error('Get tables error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch tables' 
        } 
      }, 500)
    }
  }
)

// Create table
tables.post('/',
  dualAuth,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      
      // Validate table data
      const validation = validateTable(body)
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

      // Check if table code already exists
      const existingTable = await prisma.table.findUnique({
        where: { code: body.code }
      })

      if (existingTable) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'CONFLICT', 
            message: 'Table code already exists' 
          } 
        }, 409)
      }

      const table = await prisma.table.create({
        data: {
          code: body.code,
          name: body.name,
          status: body.status || 'AVAILABLE',
          qrSecret: generateQRSecret()
        }
      })

      return c.json({ ok: true, data: table })
    } catch (error) {
      console.error('Create table error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create table' 
        } 
      }, 500)
    }
  }
)

// Get table by ID
tables.get('/:id',
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const tableId = c.req.param('id')
      
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        include: {
          currentBill: {
            select: {
              id: true,
              status: true,
              adultCount: true,
              childCount: true,
              openedAt: true,
              totalGross: true
            }
          }
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

      return c.json({ ok: true, data: table })
    } catch (error) {
      console.error('Get table error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch table' 
        } 
      }, 500)
    }
  }
)

// Update table
tables.patch('/:id',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const tableId = c.req.param('id')
      const body = await c.req.json()
      
      // Validate table data
      const validation = validateTable(body)
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

      // Check if new table code already exists (if changing code)
      if (body.code) {
        const existingTable = await prisma.table.findFirst({
          where: { 
            code: body.code,
            NOT: { id: tableId }
          }
        })

        if (existingTable) {
          return c.json({ 
            ok: false, 
            error: { 
              code: 'CONFLICT', 
              message: 'Table code already exists' 
            } 
          }, 409)
        }
      }

      const table = await prisma.table.update({
        where: { id: tableId },
        data: {
          code: body.code,
          name: body.name,
          status: body.status
        }
      })

      return c.json({ ok: true, data: table })
    } catch (error) {
      console.error('Update table error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update table' 
        } 
      }, 500)
    }
  }
)

// Generate QR code for table
tables.get('/:id/qr',
  requireScopes(['cashier:read', 'admin:read']),
  async (c) => {
    try {
      const tableId = c.req.param('id')
      const baseUrl = c.req.query('baseUrl') || `${c.req.url.split('/api')[0]}/api`
      
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: {
          code: true,
          qrSecret: true
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

      const { qrData, checkinUrl } = generateTableQRCode(
        table.code,
        table.qrSecret,
        baseUrl
      )

      return c.json({ 
        ok: true, 
        data: {
          tableCode: table.code,
          checkinUrl,
          qrData: {
            tableCode: qrData.tableCode,
            timestamp: qrData.timestamp,
            signature: qrData.signature
          }
        }
      })
    } catch (error) {
      console.error('Generate QR error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to generate QR code' 
        } 
      }, 500)
    }
  }
)

// Initialize tables (create 50 tables on first run)
export async function initializeTables() {
  try {
    const tableCount = await prisma.table.count()
    
    if (tableCount === 0) {
      const tables = []
      for (let i = 1; i <= 50; i++) {
        const tableCode = generateTableCode(i)
        tables.push({
          code: tableCode,
          name: `โต๊ะ ${i}`, // Table in Thai
          status: 'AVAILABLE' as const,
          qrSecret: generateQRSecret()
        })
      }

      await prisma.table.createMany({
        data: tables
      })
      console.log('Initialized 50 tables')
    }
  } catch (error) {
    console.error('Failed to initialize tables:', error)
  }
}

// Open a bill for a table
tables.post('/:tableId/open',
  validateJwtToken,  // Specific middleware for this route
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

      // Calculate pricing
      const pricingResult = calculateBillPricing({
        adultCount,
        childCount,
        adultPriceGross: settings.adultPriceGross,
        vatRate: settings.vatRate,
        discountType: 'NONE',
        discountValue: new Decimal(0),
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

// Method not allowed handler
tables.all('/*', (c) => {
  return c.json({ 
    ok: false, 
    error: { 
      code: 'METHOD_NOT_ALLOWED', 
      message: 'Method not allowed for this endpoint' 
    } 
  }, 405)
})

export default tables