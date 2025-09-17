import { Context, Next } from 'hono'
import prisma from '../lib/db'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'

export interface AuthUser {
  id: string
  role: 'ADMIN' | 'CASHIER' | 'READ_ONLY'
  scopes: string[]
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export async function validateApiKey(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authorization header required' } }, 401)
    }

    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid authorization format' } }, 401)
    }

    const apiKey = authHeader.substring(7)
    if (!apiKey) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } }, 401)
    }

    // Hash the provided key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: true
      }
    })

    if (!apiKeyRecord) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired API key' } }, 401)
    }

    // Set user context
    c.set('user', {
      id: apiKeyRecord.userId,
      role: apiKeyRecord.user.role,
      scopes: apiKeyRecord.scopes
    })

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } }, 500)
  }
}

export function requireScopes(requiredScopes: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }, 401)
    }

    // Check if user has any of the required scopes
    const hasRequiredScope = requiredScopes.some(scope => {
      // Wildcard scope check (e.g., "admin:*" matches "admin:read")
      const [resource, action] = scope.split(':')
      return user.scopes.some(userScope => {
        const [userResource, userAction] = userScope.split(':')
        return userResource === resource && (userAction === '*' || userAction === action)
      })
    })

    if (!hasRequiredScope) {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403)
    }

    await next()
  }
}

export function requireRole(roles: ('ADMIN' | 'CASHIER' | 'READ_ONLY')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }, 401)
    }

    if (!roles.includes(user.role)) {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Insufficient role permissions' } }, 403)
    }

    await next()
  }
}

// Generate secure API key
export function generateApiKey(): string {
  return 'mkr_' + crypto.randomBytes(32).toString('hex')
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// JWT Secret - should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// Generate JWT token
export function generateToken(userId: string, role: string): string {
  return jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  )
}

// Validate JWT token
export function validateToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Hash password for storage
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Compare password with hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Validate JWT token middleware
export async function validateJwtToken(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authorization header required' } }, 401)
    }

    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid authorization format' } }, 401)
    }

    const token = authHeader.substring(7)
    if (!token) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token required' } }, 401)
    }

    const decoded = validateToken(token)
    if (!decoded) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401)
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || !user.isActive) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' } }, 401)
    }

    // Set user context
    c.set('user', {
      id: user.id,
      role: user.role,
      scopes: getScopesForRole(user.role)
    })

    await next()
  } catch (error) {
    console.error('JWT auth middleware error:', error)
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } }, 500)
  }
}

// Get scopes for role
function getScopesForRole(role: string): string[] {
  switch (role) {
    case 'ADMIN':
      return ['admin:*']
    case 'CASHIER':
      return ['cashier:*', 'cashier:read']
    case 'READ_ONLY':
      return ['read-only:read']
    default:
      return []
  }
}

// Dual authentication middleware - supports both API key and JWT
export async function dualAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authorization header required' } }, 401)
    }

    // Check if it's a JWT token (longer than typical API key)
    if (authHeader.startsWith('Bearer ') && authHeader.length > 20) {
      return validateJwtToken(c, next)
    } else {
      return validateApiKey(c, next)
    }
  } catch (error) {
    console.error('Dual auth middleware error:', error)
    return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } }, 500)
  }
}