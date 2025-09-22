import { Hono } from 'hono'
import { Decimal } from '@prisma/client/runtime/library'
import { validateApiKey, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { validatePromotion } from '../lib/validation'

const promotions = new Hono()

promotions.use('*', validateApiKey)
promotions.use('*', errorHandler)

// Get all promotions (for management)
promotions.get('/',
  requireScopes(['admin:read']),
  async (c) => {
    try {
      const allPromotions = await prisma.promotion.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: allPromotions })
    } catch (error) {
      console.error('Get promotions error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch promotions'
        }
      }, 500)
    }
  }
)

// Get active promotions (for cashier use)
promotions.get('/active',
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const now = new Date()
      const activePromotions = await prisma.promotion.findMany({
        where: {
          active: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: activePromotions })
    } catch (error) {
      console.error('Get active promotions error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch active promotions'
        }
      }, 500)
    }
  }
)

// Create promotion (admin only)
promotions.post('/',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      
      // Validate promotion data
      const validation = validatePromotion(body)
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

      const promotion = await prisma.promotion.create({
        data: {
          key: body.key,
          name: body.name,
          type: body.type,
          value: new Decimal(body.value),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          conditions: body.conditions ? body.conditions : null,
          daysOfWeek: body.daysOfWeek || [],
          active: body.active !== undefined ? body.active : true
        }
      })

      return c.json({ ok: true, data: promotion })
    } catch (error) {
      console.error('Create promotion error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create promotion'
        }
      }, 500)
    }
  }
)

// Update promotion (admin only)
promotions.put('/:id',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const id = c.req.param('id')
      const body = await c.req.json()
      
      // Validate promotion data for update (allow partial)
      const updateData = { ...body }
      if (!updateData.key) delete updateData.key // Key can't be updated
      const validation = validatePromotion(updateData)
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

      const promotion = await prisma.promotion.update({
        where: { id },
        data: {
          name: body.name,
          type: body.type,
          value: new Decimal(body.value),
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          conditions: body.conditions ? body.conditions : null,
          daysOfWeek: body.daysOfWeek || [],
          active: body.active !== undefined ? body.active : undefined
        }
      })

      return c.json({ ok: true, data: promotion })
    } catch (error) {
      console.error('Update promotion error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update promotion'
        }
      }, 500)
    }
  }
)

// Delete promotion (admin only)
promotions.delete('/:id',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const id = c.req.param('id')

      await prisma.promotion.delete({
        where: { id }
      })

      return c.json({ ok: true, message: 'Promotion deleted successfully' })
    } catch (error) {
      console.error('Delete promotion error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete promotion'
        }
      }, 500)
    }
  }
)

export default promotions