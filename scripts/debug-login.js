const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')
const bcrypt = require('bcryptjs')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

// Define simplified Admin schema for reading
const AdminSchema = new mongoose.Schema({
    email: String,
    password: { type: String, select: true }, // Force selection of password
    role: String
})

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)

async function debugLogin() {
    try {
        console.log('1. Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        console.log('\n2. Searching for admin user...')
        const email = 'admin@fitloom.com'
        const admin = await Admin.findOne({ email }).select('+password')

        if (!admin) {
            console.error('❌ Admin user NOT FOUND in database!')
            return
        }

        console.log('✅ Admin user FOUND:')
        console.log(`- ID: ${admin._id}`)
        console.log(`- Email: ${admin.email}`)
        console.log(`- Role: ${admin.role}`)
        console.log(`- Hashed Password: ${admin.password}`)

        console.log('\n3. Testing password verification...')
        const testPassword = 'admin123'
        const isMatch = await bcrypt.compare(testPassword, admin.password)

        if (isMatch) {
            console.log('✅ Password "admin123" MATCHES the hash!')
        } else {
            console.error('❌ Password "admin123" DOES NOT MATCH the hash!')
        }

    } catch (error) {
        console.error('❌ Error during debug:', error)
    } finally {
        await mongoose.connection.close()
        process.exit(0)
    }
}

debugLogin()
