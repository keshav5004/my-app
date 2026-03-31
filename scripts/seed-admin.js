const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

// Import Admin model - need to use dynamic import or require
const bcrypt = require('bcryptjs')

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

// Hash password before saving
AdminSchema.pre('save', async function () {
    if (!this.isModified('password')) return

    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare password
AdminSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)

async function seedAdmin() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to MongoDB')

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@fitloom.com' })

        if (existingAdmin) {
            console.log('Admin user already exists! Updating password...')
            existingAdmin.password = 'Shav58'
            await existingAdmin.save()
            console.log('✅ Password updated successfully!')
            console.log('Email: admin@fitloom.com')
            console.log('Password: Shav58')
            await mongoose.connection.close()
            process.exit(0)
            return
        }

        // Create admin user
        const admin = await Admin.create({
            name: 'Admin',
            email: 'admin@fitloom.com',
            password: 'Shav58',
            role: 'super_admin'
        })

    } catch (error) {
        console.error('Error seeding admin:', error.message)
        console.error(error)
    } finally {
        await mongoose.connection.close()
        console.log('\nDatabase connection closed')
        process.exit(0)
    }
}

seedAdmin()
