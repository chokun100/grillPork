import { Hono } from 'hono'
import { dualAuth, requireScopes, generateApiKey, hashApiKey, hashPassword } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { validateUser, validateScopes } from '../lib/validation'

const users = new Hono()

users.use('*', errorHandler)

// Get all users
users.get('/',
  dualAuth,
  requireScopes(['admin:*', 'cashier:read', 'read-only:read']),
  async (c) => {
    try {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return c.json({ ok: true, data: allUsers })
    } catch (error) {
      console.error('Get users error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch users' 
        } 
      }, 500)
    }
  }
)

// Create user
users.post('/',
  dualAuth,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const body = await c.req.json()
      
      // Validate user data
      const validation = validateUser(body)
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

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: body.username }
      })

      if (existingUser) {
        return c.json({
          ok: false,
          error: {
            code: 'CONFLICT',
            message: 'Username already exists'
          }
        }, 409)
      }

      // Hash password
      const hashedPassword = await hashPassword(body.password)

      const user = await prisma.user.create({
        data: {
          name: body.name,
          username: body.username,
          password: hashedPassword,
          role: body.role,
          phone: body.phone,
          email: body.email,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return c.json({ ok: true, data: user })
    } catch (error) {
      console.error('Create user error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user'
        }
      }, 500)
    }
  }
)

// Get user by ID
users.get('/:id',
  dualAuth,
  requireScopes(['admin:*', 'cashier:read', 'read-only:read']),
  async (c) => {
    try {
      const userId = c.req.param('id')
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
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

      return c.json({ ok: true, data: user })
    } catch (error) {
      console.error('Get user error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch user' 
        } 
      }, 500)
    }
  }
)

// Update user
users.patch('/:id',
  dualAuth,
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const userId = c.req.param('id')
      const body = await c.req.json()
      
      // Validate user data (without password requirements for updates)
      const errors = []
      
      if (body.name && typeof body.name !== 'string') {
        errors.push({ field: 'name', message: 'User name must be a string' })
      }

      if (body.role && !['ADMIN', 'CASHIER', 'READ_ONLY'].includes(body.role)) {
        errors.push({ field: 'role', message: 'Role must be ADMIN, CASHIER, or READ_ONLY' })
      }

      if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' })
      }

      if (body.phone && !/^0[0-9]{9}$/.test(body.phone)) {
        errors.push({ field: 'phone', message: 'Invalid phone format' })
      }

      if (errors.length > 0) {
        return c.json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: errors
          }
        }, 400)
      }

      // Prepare update data
      const updateData: any = {}
      if (body.name) updateData.name = body.name
      if (body.role) updateData.role = body.role
      if (body.phone) updateData.phone = body.phone
      if (body.email) updateData.email = body.email

      // Handle password update if provided
      if (body.password) {
        if (typeof body.password !== 'string' || body.password.length < 6) {
          return c.json({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Password must be at least 6 characters long'
            }
          }, 400)
        }
        updateData.password = await hashPassword(body.password)
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return c.json({ ok: true, data: user })
    } catch (error) {
      console.error('Update user error:', error)
      return c.json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user'
        }
      }, 500)
    }
  }
)

// Deactivate user (soft delete)
users.delete('/:id',
  requireScopes(['admin:*']),
  async (c) => {
    try {
      const userId = c.req.param('id')
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return c.json({ ok: true, data: user })
    } catch (error) {
      console.error('Deactivate user error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to deactivate user' 
        } 
      }, 500)
    }
  }
)

export default users