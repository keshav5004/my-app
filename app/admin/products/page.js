"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Edit2, X, Search, ChevronDown, ChevronUp } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    img: null,
    imgPreview: "",
    variants: [{ size: "", color: "", images: [], price: "", availability: true }]
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProducts();
  }, []);

  const handleSearch = () => {
    fetchProducts();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      title: "",
      description: "",
      category: "",
      img: null,
      imgPreview: "",
      variants: [{ size: "", color: "", images: [], price: "", availability: true }]
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      category: product.category,
      img: null,
      imgPreview: product.img,
      variants: product.variants.map(v => ({
        size: v.size,
        color: v.color,
        images: v.images && v.images.length > 0 ? v.images : (v.img ? [v.img] : []),
        price: v.price.toString(),
        availability: v.availability
      }))
    });
    setError("");
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({
        ...form,
        img: file,
        imgPreview: URL.createObjectURL(file)
      });
    }
  };

  // Variant management
  const addVariant = () => {
    setForm({
      ...form,
      variants: [...form.variants, { size: "", color: "", images: [], price: "", availability: true }]
    });
  };

  const handleVariantImagesChange = (index, files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    const newImages = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    const updated = [...form.variants];
    const currentImagesCount = updated[index].images ? updated[index].images.length : 0;
    
    if (currentImagesCount + newImages.length > 4) {
      alert("You can only upload up to 4 photos per variant.");
      // Take only what fits up to 4
      const allowedNewImages = newImages.slice(0, 4 - currentImagesCount);
      updated[index] = { 
        ...updated[index], 
        images: [...(updated[index].images || []), ...allowedNewImages] 
      };
    } else {
      updated[index] = { 
        ...updated[index], 
        images: [...(updated[index].images || []), ...newImages] 
      };
    }
    
    setForm({ ...form, variants: updated });
  };

  const removeVariantImage = (variantIndex, imageIndex) => {
    const updated = [...form.variants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      images: updated[variantIndex].images.filter((_, i) => i !== imageIndex)
    };
    setForm({ ...form, variants: updated });
  };

  const removeVariant = (index) => {
    if (form.variants.length <= 1) return;
    setForm({
      ...form,
      variants: form.variants.filter((_, i) => i !== index)
    });
  };

  const updateVariant = (index, field, value) => {
    const updated = [...form.variants];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, variants: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Validate variants
      for (let i = 0; i < form.variants.length; i++) {
        const v = form.variants[i];
        if (!v.size || !v.color || !v.price) {
          setError(`Variant ${i + 1}: size, color, and price are required`);
          setSaving(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("variants", JSON.stringify(form.variants.map(v => ({
        size: v.size,
        color: v.color,
        price: parseFloat(v.price),
        availability: v.availability,
        images: (v.images || []).filter(img => typeof img === 'string')
      }))));

      form.variants.forEach((v, vIndex) => {
        if (v.images && v.images.length > 0) {
          v.images.forEach(img => {
            if (img.file) {
              formData.append(`variantImages_${vIndex}`, img.file);
            }
          });
        }
      });

      if (form.img) {
        formData.append("img", form.img);
      }

      let url = "/api/products";
      let method = "POST";

      if (editingProduct) {
        url = `/api/products/${editingProduct._id}`;
        method = "PATCH";
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  // Price range from variants
  const getPriceRange = (variants) => {
    if (!variants || !variants.length) return "N/A";
    const prices = variants.map(v => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Products Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {products.length} product{products.length !== 1 ? "s" : ""} in database
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm font-semibold"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or category..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium"
        >
          Search
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading products…</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first product to get started</p>
        </div>
      )}

      {/* Products Grid — Compact Cards */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              {/* Product Image — Compact */}
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                {product.img ? (
                  <img
                    src={product.img}
                    alt={product.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package size={28} className="text-gray-300" />
                  </div>
                )}
                {/* Category badge overlay */}
                <span className="absolute top-2 left-2 text-[10px] bg-white/90 backdrop-blur-sm text-indigo-700 px-2 py-0.5 rounded-full font-semibold shadow-sm">
                  {product.category}
                </span>
                {/* Variant count */}
                <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full font-medium">
                  {product.variants?.length || 0} var
                </span>
              </div>

              {/* Product Info — Compact */}
              <div className="p-3">
                <h3 className="font-semibold text-sm text-gray-900 truncate" title={product.title}>
                  {product.title}
                </h3>
                <p className="text-indigo-600 font-bold text-xs mt-1">
                  {getPriceRange(product.variants)}
                </p>

                {/* Description — single line */}
                <p className="text-gray-400 text-[11px] mt-1 line-clamp-1">{product.description}</p>

                {/* Variants toggle */}
                <button
                  onClick={() => setExpandedProduct(expandedProduct === product._id ? null : product._id)}
                  className="flex items-center gap-1 text-[11px] text-indigo-500 mt-2 hover:text-indigo-700 font-medium"
                >
                  {expandedProduct === product._id ? "Hide" : "Show"} variants
                  {expandedProduct === product._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Expanded variants */}
                {expandedProduct === product._id && (
                  <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                    {product.variants?.map((v, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px] bg-gray-50 rounded-lg px-2 py-1.5">
                        <span className="text-gray-600">
                          <span className="font-medium text-gray-800">{v.size}</span> / {v.color}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900">₹{v.price}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.availability ? "bg-green-500" : "bg-red-400"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons — Compact */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] text-indigo-600 font-medium py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    disabled={deleting === product._id}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] text-red-500 font-medium py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={11} /> {deleting === product._id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row count */}
      {!loading && products.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-right">
          Showing {products.length} product{products.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-100 rounded-t-2xl z-10">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl text-gray-900 font-semibold">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Classic Cotton Shirt"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product description..."
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Shirts, Pants, Dresses"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image {!editingProduct && "*"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-black text-sm"
                  onChange={handleImageChange}
                  required={!editingProduct}
                />
                {form.imgPreview && (
                  <img
                    src={form.imgPreview}
                    alt="Preview"
                    className="mt-2 h-32 w-auto object-cover rounded-lg border"
                  />
                )}
              </div>

              {/* Variants Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">Variants *</label>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {form.variants.map((variant, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Variant {index + 1}</span>
                        {form.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Size (e.g. M, L, XL)"
                          className="border border-gray-300 p-2 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={variant.size}
                          onChange={(e) => updateVariant(index, "size", e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Color (e.g. Red, Blue)"
                          className="border border-gray-300 p-2 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={variant.color}
                          onChange={(e) => updateVariant(index, "color", e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          className="col-span-2 border border-gray-300 p-2 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, "price", e.target.value)}
                          required
                        />

                        <div className="col-span-2 mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold text-gray-800">Variant Photos</label>
                            <span className={`text-xs font-bold ${variant.images?.length === 4 ? 'text-green-600' : 'text-gray-500'}`}>
                              {variant.images?.length || 0} / 4 uploaded
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mb-3">Add up to 4 photos for this variant.</p>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={variant.images?.length >= 4}
                            className="w-full text-black text-sm border border-gray-300 p-2 rounded-lg bg-gray-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            onChange={(e) => handleVariantImagesChange(index, e.target.files)}
                          />
                          {variant.images && variant.images.length > 0 && (
                            <div className="flex gap-3 mt-3 flex-wrap">
                              {variant.images.map((imgObj, imgIndex) => {
                                const imgSrc = imgObj.preview || (typeof imgObj === 'string' ? imgObj : '');
                                return (
                                  <div key={imgIndex} className="relative group ring-2 ring-transparent hover:ring-indigo-200 rounded-md transition-all">
                                    <img src={imgSrc} className="h-16 w-16 object-cover rounded-md border border-gray-200" alt="variant preview" />
                                    <button
                                      type="button"
                                      onClick={() => removeVariantImage(index, imgIndex)}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity drop-shadow-md z-10 hover:bg-red-600 hover:scale-110"
                                      title="Remove photo"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={variant.availability}
                          onChange={(e) => updateVariant(index, "availability", e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Available
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow hover:scale-105 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
