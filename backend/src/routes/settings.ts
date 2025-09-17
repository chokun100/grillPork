import { Hono } from 'hono'
import { dualAuth, requireScopes } from '../middleware/auth'
import { validateBody, errorHandler, getValidatedBody } from '../middleware/validation'
import prisma from '../lib/db'
import { validateSettings } from '../lib/validation'

const settings = new Hono()

settings.use('*', errorHandler)

// Get settings - support both API key and JWT authentication
settings.get('/',
  dualAuth,
  requireScopes(['admin:read', 'cashier:read', 'read-only:read']),
  async (c) => {
    try {
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
        }, 404)
      }

      return c.json({ 
        ok: true, 
        data: {
          adultPriceGross: settings.adultPriceGross,
          currency: settings.currency,
          vatIncluded: settings.vatIncluded,
          vatRate: settings.vatRate,
          roundingMode: settings.roundingMode,
          locales: settings.locales
        }
      })
    } catch (error) {
      console.error('Get settings error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch settings' 
        } 
      }, 500)
    }
  }
)

// Update settings (admin only) - support both API key and JWT authentication
settings.patch('/',
  dualAuth,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      
      // Validate settings
      const validation = validateSettings(body)
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

      const settings = await prisma.settings.update({
        where: { id: 'singleton' },
        data: {
          adultPriceGross: body.adultPriceGross,
          currency: body.currency,
          vatIncluded: body.vatIncluded,
          vatRate: body.vatRate,
          roundingMode: body.roundingMode,
          locales: body.locales
        }
      })

      return c.json({ 
        ok: true, 
        data: {
          adultPriceGross: settings.adultPriceGross,
          currency: settings.currency,
          vatIncluded: settings.vatIncluded,
          vatRate: settings.vatRate,
          roundingMode: settings.roundingMode,
          locales: settings.locales
        }
      })
    } catch (error) {
      console.error('Update settings error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update settings' 
        } 
      }, 500)
    }
  }
)

// Initialize settings if not exists
export async function initializeSettings() {
  try {
    const existing = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    })

    if (!existing) {
      await prisma.settings.create({
        data: {
          id: 'singleton',
          adultPriceGross: 299.00, // Default price from design
          currency: 'THB',
          vatIncluded: true,
          vatRate: 0.07,
          roundingMode: 'NONE',
          locales: ['th', 'en']
        }
      })
      console.log('Settings initialized with default values')
    }
  } catch (error) {
    console.error('Failed to initialize settings:', error)
  }
}

export default settings