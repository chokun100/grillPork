import { Context, Next } from 'hono'
import { buildErrorResponse, ValidationError } from '../lib/validation'

export async function validateBody(schema: (data: any) => { isValid: boolean; errors: ValidationError[] }) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validation = schema(body)

      if (!validation.isValid) {
        return c.json(buildErrorResponse(validation.errors), 400)
      }

      // Store validated data in context for use in route handlers
      c.set('validatedBody', body)
      await next()
    } catch (error) {
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INVALID_BODY', 
          message: 'Invalid request body' 
        } 
      }, 400)
    }
  }
}

export async function validateQuery(schema: (query: any) => { isValid: boolean; errors: ValidationError[] }) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validation = schema(query)

      if (!validation.isValid) {
        return c.json(buildErrorResponse(validation.errors), 400)
      }

      c.set('validatedQuery', query)
      await next()
    } catch (error) {
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INVALID_QUERY', 
          message: 'Invalid query parameters' 
        } 
      }, 400)
    }
  }
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (error) {
    console.error('Unhandled error:', error)
    
    if (error instanceof Error) {
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error.message || 'Internal server error' 
        } 
      }, 500)
    }
    
    return c.json({ 
      ok: false, 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'An unexpected error occurred' 
      } 
    }, 500)
  }
}

export function notFoundHandler(c: Context) {
  return c.json({ 
    ok: false, 
    error: { 
      code: 'NOT_FOUND', 
      message: 'Resource not found' 
    } 
  }, 404)
}

export function methodNotAllowedHandler(c: Context) {
  return c.json({ 
    ok: false, 
    error: { 
      code: 'METHOD_NOT_ALLOWED', 
      message: 'Method not allowed' 
    } 
  }, 405)
}

// Helper to get validated data from context
export function getValidatedBody<T>(c: Context): T {
  return c.get('validatedBody') as T
}

export function getValidatedQuery<T>(c: Context): T {
  return c.get('validatedQuery') as T
}