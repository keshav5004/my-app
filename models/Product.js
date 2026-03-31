import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true },
  color: { type: String, required: true },
  img: { type: String },
  price: { type: Number, required: true },
  availability: { type: Boolean, required: true },
})

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  img: { type: String, required: true },
  category: { type: String, required: true },
  variants: { type: [variantSchema], required: true },
})

export default mongoose.models.Product || mongoose.model('Product', productSchema)