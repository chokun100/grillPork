import { Hono } from 'hono'
import { validateApiKey, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { validatePhone } from '../lib/validation'

const customers = new Hono()

customers.use('*', validateApiKey)
customers.use('*', errorHandler)

// Lookup customer by phone
customers.get('/lookup',
  requireScopes(['cashier:read', 'admin:read']),
  async (c) => {
    try {
      const phone = c.req.query('phone')
      
      if (!phone) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'MISSING_PARAM', 
            message: 'Phone parameter is required' 
          } 
        }, 400)
      }

      if (!validatePhone(phone)) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_PHONE', 
            message: 'Invalid phone number format' 
          } 
        }, 400)
      }

      const customer = await prisma.customer.findUnique({
        where: { phone },
        include: {
          bills: {
            where: { status: 'CLOSED' },
            select: {
              id: true,
              openedAt: true,
              totalGross: true,
              loyaltyFreeApplied: true
            },
            orderBy: { openedAt: 'desc' },
            take: 5
          }
        }
      })

      if (!customer) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Customer not found' 
          } 
        }, 404)
      }

      return c.json({ 
        ok: true, 
        data: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          loyaltyStamps: customer.loyaltyStamps,
          recentBills: customer.bills,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      })
    } catch (error) {
      console.error('Lookup customer error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to lookup customer' 
        } 
      }, 500)
    }
  }
)

// Adjust loyalty stamps
customers.patch('/:id/stamps',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const customerId = c.req.param('id')
      const body = await c.req.json()
      const { adjustment, reason } = body

      if (typeof adjustment !== 'number') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_ADJUSTMENT', 
            message: 'Adjustment must be a number' 
          } 
        }, 400)
      }

      // Get current customer
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })

      if (!customer) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Customer not found' 
          } 
        }, 404)
      }

      const newStamps = customer.loyaltyStamps + adjustment

      if (newStamps < 0) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_STAMPS', 
            message: 'Loyalty stamps cannot be negative' 
          } 
        }, 400)
      }

      // Update customer stamps
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: { 
          loyaltyStamps: newStamps,
          updatedAt: new Date()
        }
      })

      return c.json({ 
        ok: true, 
        data: {
          id: updatedCustomer.id,
          phone: updatedCustomer.phone,
          name: updatedCustomer.name,
          loyaltyStamps: updatedCustomer.loyaltyStamps,
          adjustment: adjustment,
          reason: reason || 'Manual adjustment'
        }
      })
    } catch (error) {
      console.error('Adjust loyalty stamps error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to adjust loyalty stamps' 
        } 
      }, 500)
    }
  }
)

// Get customer by ID
customers.get('/:id',
  requireScopes(['cashier:read', 'admin:read']),
  async (c) => {
    try {
      const customerId = c.req.param('id')
      
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          bills: {
            where: { status: 'CLOSED' },
            select: {
              id: true,
              openedAt: true,
              totalGross: true,
              loyaltyFreeApplied: true,
              table: {
                select: {
                  code: true,
                  name: true
                }
              }
            },
            orderBy: { openedAt: 'desc' },
            take: 10
          }
        }
      })

      if (!customer) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Customer not found' 
          } 
        }, 404)
      }

      return c.json({ 
        ok: true, 
        data: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          loyaltyStamps: customer.loyaltyStamps,
          recentBills: customer.bills,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      })
    } catch (error) {
      console.error('Get customer error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch customer' 
        } 
      }, 500)
    }
  }
)

// Update customer information
customers.patch('/:id',
  requireScopes(['cashier:*', 'admin:*']),
  async (c) => {
    try {
      const customerId = c.req.param('id')
      const body = await c.req.json()
      const { name } = body

      if (!name || typeof name !== 'string') {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'INVALID_NAME', 
            message: 'Name is required and must be a string' 
          } 
        }, 400)
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: { 
          name,
          updatedAt: new Date()
        }
      })

      return c.json({ 
        ok: true, 
        data: {
          id: customer.id,
          phone: customer.phone,
          name: customer.name,
          loyaltyStamps: customer.loyaltyStamps,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      })
    } catch (error) {
      console.error('Update customer error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update customer' 
        } 
      }, 500)
    }
  }
)

export default customers