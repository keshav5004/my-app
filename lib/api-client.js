class ApiClient {
    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_URL || ''
    }

    getToken() {
        return localStorage.getItem('token')
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`
        const token = this.getToken()

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
        }

        const response = await fetch(url, config)

        // Handle 401 - token expired
        if (response.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/'
            throw new Error('Session expired. Please login again.')
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }))
            throw new Error(error.error || `HTTP error! status: ${response.status}`)
        }

        return response.json()
    }

    // Dashboard
    getDashboardStats() {
        return this.request('/api/dashboard')
    }

    // Products
    getProducts(search = '') {
        const query = search ? `?search=${encodeURIComponent(search)}` : ''
        return this.request(`/api/products${query}`)
    }

    async createProduct(formData) {
        const url = `${this.baseURL}/api/products`
        const token = this.getToken()
        const res = await fetch(url, {
            method: 'POST',
            headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
            body: formData
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Request failed' }))
            throw new Error(err.error || 'Failed to create product')
        }
        return res.json()
    }

    async updateProduct(id, formData) {
        const url = `${this.baseURL}/api/products/${id}`
        const token = this.getToken()
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
            body: formData
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Request failed' }))
            throw new Error(err.error || 'Failed to update product')
        }
        return res.json()
    }

    deleteProduct(id) {
        return this.request(`/api/products/${id}`, {
            method: 'DELETE',
        })
    }

    // Orders
    getOrders(search = '', status = '') {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        const query = params.toString() ? `?${params.toString()}` : ''
        return this.request(`/api/orders${query}`)
    }

    getOrder(id) {
        return this.request(`/api/orders/${id}`)
    }

    updateOrderStatus(id, status) {
        return this.request(`/api/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        })
    }

    updateOrder(id, data) {
        return this.request(`/api/orders/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    }

    // Users
    getUsers(search = '') {
        const query = search ? `?search=${encodeURIComponent(search)}` : ''
        return this.request(`/api/users${query}`)
    }

    updateUserStatus(id, status) {
        return this.request(`/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        })
    }

    updateUser(id, data) {
        return this.request(`/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    }

    // Payments
    getPayments() {
        return this.request('/api/payments')
    }

    updatePaymentStatus(id, status) {
        return this.request(`/api/payments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        })
    }

    exportPayments() {
        const token = this.getToken()
        window.open(`/api/payments/export?token=${token}`, '_blank')
    }
}

export const apiClient = new ApiClient()