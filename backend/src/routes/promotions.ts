import { Hono } from 'hono'
import { validateApiKey, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { validatePromotion } from '../lib/validation'

const promotions = new Hono()

promotions.use('*', validateApiKey)
promotions.use('*', errorHandler)

// Get all active promotions
promotions.get('/',
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const activePromotions = await prisma.promotion.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: activePromotions })
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
          value: body.value,
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

export default promotions