import { Hono } from 'hono'
import { Decimal } from '@prisma/client/runtime/library'
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
          locales: settings.locales,
          promptPayTarget: settings.promptPayTarget
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

      // Prepare update data - only safe fields that exist in schema
      const updateData: any = {}
      if (body.adultPriceGross !== undefined && !isNaN(parseFloat(body.adultPriceGross))) {
        updateData.adultPriceGross = new Decimal(body.adultPriceGross)
      }
      if (body.vatRate !== undefined && !isNaN(parseFloat(body.vatRate))) {
        updateData.vatRate = new Decimal(body.vatRate)
      }
      if (body.promptPayTarget !== undefined) {
        updateData.promptPayTarget = body.promptPayTarget || null
      }

      const settings = await prisma.settings.update({
        where: { id: 'singleton' },
        data: updateData
      })

      return c.json({
        ok: true,
        data: {
          adultPriceGross: settings.adultPriceGross.toNumber(),
          vatRate: settings.vatRate.toNumber(),
          promptPayTarget: settings.promptPayTarget
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
          locales: ['th', 'en'],
          promptPayTarget: null
        }
      })
      console.log('Settings initialized with default values')
    }
  } catch (error) {
    console.error('Failed to initialize settings:', error)
  }
}

export default settings