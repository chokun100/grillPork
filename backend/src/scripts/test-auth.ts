import prisma from '../lib/db'
import { hashPassword } from '../middleware/auth'

async function testAuthSystem() {
  try {
    console.log('🧪 Testing new authentication system...')
    
    // Create a test user with username/password
    const testUsername = 'testuser'
    const testPassword = 'test123'
    const hashedPassword = await hashPassword(testPassword)
    
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: testUsername }
    })
    
    if (existingUser) {
      console.log('✅ Test user already exists')
      
      // Update with password
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      })
      console.log('✅ Updated test user with password')
    } else {
      // Create new test user
      const testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          username: testUsername,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('✅ Created test user:', testUser.username)
    }
    
    console.log('🎉 Authentication system test completed!')
    console.log('📋 Test credentials:')
    console.log('   Username:', testUsername)
    console.log('   Password:', testPassword)
    console.log('')
    console.log('🔑 To test login, make a POST request to:')
    console.log('   http://localhost:3001/api/auth/login')
    console.log('')
    console.log('📤 Request body:')
    console.log('   {')
    console.log('     "username": "testuser",')
    console.log('     "password": "test123"')
    console.log('   }')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuthSystem()