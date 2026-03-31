import mongoose from 'mongoose'

const AddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    isDefault: { type: Boolean, default: false },
    addressType: { type: String, default: 'home' },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Address || mongoose.model('Address', AddressSchema)
