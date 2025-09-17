import { Hono } from 'hono'
import { validateApiKey, requireScopes, generateApiKey, hashApiKey, validateJwtToken, generateToken, hashPassword, comparePassword } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { validateScopes, validateLogin } from '../lib/validation'

const auth = new Hono()

auth.use('*', errorHandler)

// Create API key for a user
auth.post('/apikeys',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      const { userId, label, scopes, expiresAt } = body

      // Validate scopes
      const scopeValidation = validateScopes(scopes)
      if (!scopeValidation.isValid) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Validation failed',
            details: scopeValidation.errors
          } 
        }, 400)
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'User not found' 
          } 
        }, 404)
      }

      // Generate new API key
      const apiKey = generateApiKey()
      const keyHash = hashApiKey(apiKey)

      // Create API key record
      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          keyHash,
          label,
          scopes,
          userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })

      // Return the plain API key (only shown once)
      return c.json({ 
        ok: true, 
        data: {
          apiKey,
          id: apiKeyRecord.id,
          label: apiKeyRecord.label,
          scopes: apiKeyRecord.scopes,
          expiresAt: apiKeyRecord.expiresAt,
          user: apiKeyRecord.user
        }
      })
    } catch (error) {
      console.error('Create API key error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create API key' 
        } 
      }, 500)
    }
  }
)

// Revoke API key
auth.post('/apikeys/:id/revoke',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const apiKeyId = c.req.param('id')
      
      const apiKey = await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { revokedAt: new Date() },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })

      return c.json({ 
        ok: true, 
        data: {
          id: apiKey.id,
          label: apiKey.label,
          scopes: apiKey.scopes,
          revokedAt: apiKey.revokedAt,
          user: apiKey.user
        }
      })
    } catch (error) {
      console.error('Revoke API key error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to revoke API key' 
        } 
      }, 500)
    }
  }
)

// List API keys for a user
auth.get('/users/:userId/apikeys',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const userId = c.req.param('userId')
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return c.json({ 
          ok: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'User not found' 
          } 
        }, 404)
      }

      const apiKeys = await prisma.apiKey.findMany({
        where: { 
          userId,
          revokedAt: null 
        },
        select: {
          id: true,
          label: true,
          scopes: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: apiKeys })
    } catch (error) {
      console.error('List API keys error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch API keys' 
        } 
      }, 500)
    }
  }
)

// User login with username/password
auth.post('/login',
  async (c) => {
    try {
      const body = await c.req.json()
      
      // Validate login data
      const validation = validateLogin(body)
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

      const { username, password } = body

      // Find user by username
      const user = await prisma.user.findUnique({
        where: { username }
      })

      if (!user || !user.password) {
        return c.json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password'
          }
        }, 401)
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password)
      if (!isValidPassword) {
        return c.json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password'
          }
        }, 401)
      }

      // Generate JWT token
      const token = generateToken(user.id, user.role)

      return c.json({
        ok: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
          }
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        }
      }, 500)
    }
  }
)

// Get current user's API keys (for the authenticated user) - requires JWT auth
auth.get('/my/apikeys',
  validateJwtToken,
  async (c) => {
    try {
      const user = c.get('user')
      
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          userId: user.id,
          revokedAt: null
        },
        select: {
          id: true,
          label: true,
          scopes: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: apiKeys })
    } catch (error) {
      console.error('List my API keys error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch API keys'
        }
      }, 500)
    }
  }
)

// API Key routes still use API key authentication for backward compatibility
auth.post('/apikeys',
  validateApiKey,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      const { userId, label, scopes, expiresAt } = body

      // Validate scopes
      const scopeValidation = validateScopes(scopes)
      if (!scopeValidation.isValid) {
        return c.json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: scopeValidation.errors
          }
        }, 400)
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return c.json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        }, 404)
      }

      // Generate new API key
      const apiKey = generateApiKey()
      const keyHash = hashApiKey(apiKey)

      // Create API key record
      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          keyHash,
          label,
          scopes,
          userId,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })

      // Return the plain API key (only shown once)
      return c.json({
        ok: true,
        data: {
          apiKey,
          id: apiKeyRecord.id,
          label: apiKeyRecord.label,
          scopes: apiKeyRecord.scopes,
          expiresAt: apiKeyRecord.expiresAt,
          user: apiKeyRecord.user
        }
      })
    } catch (error) {
      console.error('Create API key error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create API key'
        }
      }, 500)
    }
  }
)

auth.post('/apikeys/:id/revoke',
  validateApiKey,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const apiKeyId = c.req.param('id')
      
      const apiKey = await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { revokedAt: new Date() },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      })

      return c.json({
        ok: true,
        data: {
          id: apiKey.id,
          label: apiKey.label,
          scopes: apiKey.scopes,
          revokedAt: apiKey.revokedAt,
          user: apiKey.user
        }
      })
    } catch (error) {
      console.error('Revoke API key error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke API key'
        }
      }, 500)
    }
  }
)

auth.get('/users/:userId/apikeys',
  validateApiKey,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const userId = c.req.param('userId')
      
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return c.json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        }, 404)
      }

      const apiKeys = await prisma.apiKey.findMany({
        where: {
          userId,
          revokedAt: null
        },
        select: {
          id: true,
          label: true,
          scopes: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return c.json({ ok: true, data: apiKeys })
    } catch (error) {
      console.error('List API keys error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch API keys'
        }
      }, 500)
    }
  }
)

export default auth