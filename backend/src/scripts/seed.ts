import prisma from '../lib/db'
import { hashApiKey, generateApiKey, hashPassword } from '../middleware/auth'
import { Decimal } from '@prisma/client/runtime/library'

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Check if admin user exists
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    let adminUserId: string

    const adminUsername = 'admin'
    const adminPassword = await hashPassword('admin123')

    if (!adminUser) {
      // Create admin user
      const newAdmin = await prisma.user.create({
        data: {
          name: 'Admin User',
          username: adminUsername,
          password: adminPassword,
          role: 'ADMIN',
          email: 'admin@mookrata.com',
          phone: '0812345678',
          isActive: true
        }
      })
      adminUserId = newAdmin.id
      console.log('✅ Created admin user')
    } else {
      // Update existing admin with username and password only if not set
      const updateAdminData: any = { password: adminPassword }
      if (!adminUser.username) {
        updateAdminData.username = adminUsername
      }
      await prisma.user.update({
        where: { id: adminUser.id },
        data: updateAdminData
      })
      adminUserId = adminUser.id
      if (!adminUser.username) {
        console.log('ℹ️  Updated admin user with credentials')
      } else {
        console.log('ℹ️  Admin user already has credentials')
      }
    }

    // Create admin API key
    const existingAdminKey = await prisma.apiKey.findFirst({
      where: { 
        label: 'Admin Master Key',
        revokedAt: null 
      }
    })

    let adminApiKey: string | null = null

    if (!existingAdminKey) {
      const apiKey = generateApiKey()
      const keyHash = hashApiKey(apiKey)

      await prisma.apiKey.create({
        data: {
          keyHash,
          label: 'Admin Master Key',
          scopes: ['admin:*'],
          userId: adminUserId,
          revokedAt: null,
          expiresAt: null
        }
      })
      
      adminApiKey = apiKey
      console.log('✅ Created admin API key')
    } else {
      console.log('ℹ️  Admin API key already exists')
    }

    // Create sample cashier user
    const cashierUser = await prisma.user.findFirst({
      where: { role: 'CASHIER' }
    })

    const cashierUsername = 'cashier'
    const cashierPassword = await hashPassword('cashier123')

    if (!cashierUser) {
      await prisma.user.create({
        data: {
          name: 'Cashier User',
          username: cashierUsername,
          password: cashierPassword,
          role: 'CASHIER',
          email: 'cashier@mookrata.com',
          phone: '0812345679',
          isActive: true
        }
      })
      console.log('✅ Created cashier user')
    } else {
      // Update existing cashier with username and password only if not set
      const updateCashierData: any = { password: cashierPassword }
      if (!cashierUser.username) {
        updateCashierData.username = cashierUsername
      }
      await prisma.user.update({
        where: { id: cashierUser.id },
        data: updateCashierData
      })
      if (!cashierUser.username) {
        console.log('ℹ️  Updated cashier user with credentials')
      } else {
        console.log('ℹ️  Cashier user already has credentials')
      }
    }

    // Create weekend promotion
    const weekendPromotion = await prisma.promotion.findFirst({
      where: { key: 'WEEKEND_10_OFF' }
    })

    if (!weekendPromotion) {
      await prisma.promotion.create({
        data: {
          key: 'WEEKEND_10_OFF',
          name: 'Weekend 10% Off',
          type: 'PERCENT',
          value: new Decimal(10),
          daysOfWeek: ['SAT', 'SUN'],
          active: true
        }
      })
      console.log('✅ Created weekend promotion')
    } else {
      console.log('ℹ️  Weekend promotion already exists')
    }

    // Create settings if not exists
    const settings = await prisma.settings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings) {
      await prisma.settings.create({
        data: {
          id: 'singleton',
          adultPriceGross: new Decimal(299.00),
          currency: 'THB',
          vatIncluded: true,
          vatRate: new Decimal(0.07),
          roundingMode: 'NONE',
          locales: ['th', 'en']
        }
      })
      console.log('✅ Created default settings')
    } else {
      console.log('ℹ️  Settings already exist')
    }

    console.log('🎉 Database seed completed successfully!')
    
    console.log('\n👤 Default login credentials:')
    console.log('   Admin: username=admin, password=admin123')
    console.log('   Cashier: username=cashier, password=cashier123')
    
    if (adminApiKey) {
      console.log('\n🔑 Admin API Key (save this - shown only once):')
      console.log(`   ${adminApiKey}`)
      console.log('\n   Use this key with: Authorization: Bearer <API_KEY>')
    }

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
}

export { seed }