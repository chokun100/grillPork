import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler, notFoundHandler, methodNotAllowedHandler } from './middleware/validation'
import { initializeSettings } from './routes/settings'
import { initializeTables } from './routes/tables'
import settings from './routes/settings'
import users from './routes/users'
import auth from './routes/auth'
import tables from './routes/tables'
import tableOpen from './routes/table-open'
import bills from './routes/bills'
import customers from './routes/customers'
import reports from './routes/reports'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Error handling
app.notFound(notFoundHandler)
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  }, 500)
})

// Initialize system on startup
async function initializeSystem() {
  try {
    console.log('Initializing Mookrata POS system...')
    
    await initializeSettings()
    await initializeTables()
    
    console.log('✅ System initialization completed')
  } catch (error) {
    console.error('❌ System initialization failed:', error)
    process.exit(1)
  }
}

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Mookrata POS API',
    version: '1.0.0',
    description: 'All-you-can-eat Mookrata restaurant POS system',
    endpoints: {
      settings: '/api/settings',
      users: '/api/users',
      auth: '/api/auth',
      tables: '/api/tables',
      bills: '/api/bills',
      customers: '/api/customers',
      reports: '/api/reports',
      checkin: '/api/checkin'
    }
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// API routes
app.route('/api/settings', settings)
app.route('/api/users', users)
app.route('/api/auth', auth)
app.route('/api/tables', tables)  // This now includes the open endpoint
app.route('/api/bills', bills)
app.route('/api/customers', customers)
app.route('/api/reports', reports)

// Method not allowed for root API path
app.all('/api/*', methodNotAllowedHandler)

// Initialize system before starting server
initializeSystem().then(() => {
  console.log('🚀 Mookrata POS API ready')
})

export default app
