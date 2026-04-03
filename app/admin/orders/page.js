"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";

// ── Helpers ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString("en-IN")}`;
}

const STATUS_CONFIG = {
    pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
        label: "Pending",
    },
    confirmed: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        dot: "bg-blue-500",
        label: "Confirmed",
    },
    shipped: {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200",
        dot: "bg-indigo-500",
        label: "Shipped",
    },
    delivered: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
        label: "Delivered",
    },
    cancelled: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
        label: "Cancelled",
    },
    returned: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        dot: "bg-gray-500",
        label: "Returned",
    },
};

const PAYMENT_CONFIG = {
    cod: { label: "COD", bg: "bg-orange-50", text: "text-orange-700" },
    online: { label: "Online", bg: "bg-green-50", text: "text-green-700" },
    card: { label: "Card", bg: "bg-purple-50", text: "text-purple-700" },
};

// ── Main Component ───────────────────────────────────────────────────────
export default function OrdersPage() {
    const [todayOrders, setTodayOrders] = useState([]);
    const [yesterdayOrders, setYesterdayOrders] = useState([]);
    const [olderOrders, setOlderOrders] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [olderExpanded, setOlderExpanded] = useState(false);
    const [olderPage, setOlderPage] = useState(1);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const prevCountRef = useRef(0);
    const OLDER_PAGE_SIZE = 10;

    // ── Fetch Orders ─────────────────────────────────────────────────────
    const fetchOrders = useCallback(
        async (isPolling = false) => {
            try {
                if (!isPolling) setLoading(true);
                const data = await apiClient.getOrders(search, filterStatus);
                if (data.success) {
                    // Detect new orders
                    const newTotal =
                        data.todayOrders.length +
                        data.yesterdayOrders.length +
                        data.olderOrders.length;
                    if (isPolling && newTotal > prevCountRef.current) {
                        setNewOrderAlert(true);
                        setTimeout(() => setNewOrderAlert(false), 5000);
                    }
                    prevCountRef.current = newTotal;

                    setTodayOrders(data.todayOrders);
                    setYesterdayOrders(data.yesterdayOrders);
                    setOlderOrders(data.olderOrders);
                    setStats(data.stats);
                    setLastFetchTime(new Date());
                }
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            } finally {
                setLoading(false);
            }
        },
        [search, filterStatus]
    );

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => fetchOrders(true), 30000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    // ── Update Status ────────────────────────────────────────────────────
    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingStatus(orderId);
        try {
            await apiClient.updateOrderStatus(orderId, newStatus);
            await fetchOrders();
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdatingStatus(null);
        }
    };

    // ── Paginated older orders ───────────────────────────────────────────
    const paginatedOlder = olderOrders.slice(0, olderPage * OLDER_PAGE_SIZE);
    const hasMoreOlder = paginatedOlder.length < olderOrders.length;

    // ── Render ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">
                            Loading orders...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
            {/* ── NEW ORDER TOAST ────────────────────────────────────── */}
            {newOrderAlert && (
                <div className="fixed top-6 right-6 z-50 animate-slide-in">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                        </span>
                        <span className="font-medium">
                            🎉 New order received!
                        </span>
                    </div>
                </div>
            )}

            {/* ── HEADER ────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Live Orders
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-500 text-sm">
                            Real-time order tracking & management
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Live
                        </div>
                    </div>
                </div>

                {lastFetchTime && (
                    <p className="text-xs text-gray-400">
                        Last updated:{" "}
                        {lastFetchTime.toLocaleTimeString("en-IN")}
                    </p>
                )}
            </div>

            {/* ── SEARCH + FILTER ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        id="order-search"
                        type="text"
                        placeholder="Search by Order ID, customer name, email or phone..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    id="order-status-filter"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all min-w-[160px]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returned">Returned</option>
                </select>
            </div>

            {/* ── STATS CARDS ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Today's Orders"
                    value={stats.todayCount || 0}
                    sub={formatCurrency(stats.todayRevenue)}
                    icon="📦"
                    gradient="from-purple-500 to-indigo-500"
                />
                <StatCard
                    label="Yesterday"
                    value={stats.yesterdayCount || 0}
                    sub={formatCurrency(stats.yesterdayRevenue)}
                    icon="📋"
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatCard
                    label="Pending"
                    value={stats.pendingCount || 0}
                    sub="Awaiting action"
                    icon="⏳"
                    gradient="from-amber-500 to-orange-500"
                />
                <StatCard
                    label="Delivered"
                    value={stats.deliveredCount || 0}
                    sub="Completed"
                    icon="✅"
                    gradient="from-emerald-500 to-teal-500"
                />
            </div>

            {/* ── TODAY'S ORDERS ─────────────────────────────────────── */}
            <OrderSection
                title="Today's Orders"
                icon="🔴"
                badge={todayOrders.length}
                accentColor="purple"
                orders={todayOrders}
                onView={setSelectedOrder}
                onStatusChange={handleStatusChange}
                updatingStatus={updatingStatus}
                emptyMessage="No orders today yet. They'll appear here in real-time!"
                showTimeAgo
            />

            {/* ── YESTERDAY'S ORDERS ────────────────────────────────── */}
            <OrderSection
                title="Yesterday's Orders"
                icon="🟡"
                badge={yesterdayOrders.length}
                accentColor="blue"
                orders={yesterdayOrders}
                onView={setSelectedOrder}
                onStatusChange={handleStatusChange}
                updatingStatus={updatingStatus}
                emptyMessage="No orders from yesterday."
            />

            {/* ── OLDER ORDERS ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    id="toggle-older-orders"
                    onClick={() => setOlderExpanded(!olderExpanded)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg">📦</span>
                        <h2 className="text-base font-semibold text-gray-800">
                            Previous Orders
                        </h2>
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            {olderOrders.length}
                        </span>
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            olderExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {olderExpanded && (
                    <div className="border-t border-gray-100">
                        {olderOrders.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-8">
                                No previous orders found.
                            </p>
                        ) : (
                            <>
                                <OrderTable
                                    orders={paginatedOlder}
                                    onView={setSelectedOrder}
                                    onStatusChange={handleStatusChange}
                                    updatingStatus={updatingStatus}
                                />
                                {hasMoreOlder && (
                                    <div className="flex justify-center py-4 border-t border-gray-50">
                                        <button
                                            id="load-more-orders"
                                            onClick={() =>
                                                setOlderPage((p) => p + 1)
                                            }
                                            className="px-6 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                                        >
                                            Load more (
                                            {olderOrders.length -
                                                paginatedOlder.length}{" "}
                                            remaining)
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── ORDER DETAIL MODAL ────────────────────────────────── */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                    updatingStatus={updatingStatus}
                />
            )}
        </div>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, gradient }) {
    return (
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group hover:shadow-md transition-shadow">
            <div
                className={`absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`}
            />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {label}
                    </p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                        {value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{sub}</p>
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </div>
    );
}

// ── Order Section (Today / Yesterday) ────────────────────────────────────
function OrderSection({
    title,
    icon,
    badge,
    accentColor,
    orders,
    onView,
    onStatusChange,
    updatingStatus,
    emptyMessage,
    showTimeAgo,
}) {
    const accentColors = {
        purple: "border-l-purple-500",
        blue: "border-l-blue-500",
    };

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden border-l-4 ${
                accentColors[accentColor] || ""
            }`}
        >
            <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-50">
                <span className="text-lg">{icon}</span>
                <h2 className="text-base font-semibold text-gray-800">
                    {title}
                </h2>
                <span
                    className={`bg-${accentColor}-100 text-${accentColor}-700 text-xs font-medium px-2.5 py-1 rounded-full`}
                >
                    {badge}
                </span>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                    <span className="text-4xl mb-3">📭</span>
                    <p className="text-gray-400 text-sm text-center">
                        {emptyMessage}
                    </p>
                </div>
            ) : (
                <OrderTable
                    orders={orders}
                    onView={onView}
                    onStatusChange={onStatusChange}
                    updatingStatus={updatingStatus}
                    showTimeAgo={showTimeAgo}
                />
            )}
        </div>
    );
}

// ── Order Table ──────────────────────────────────────────────────────────
function OrderTable({
    orders,
    onView,
    onStatusChange,
    updatingStatus,
    showTimeAgo,
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50/80">
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Order
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Customer
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            Products
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Total
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                            Payment
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            {showTimeAgo ? "Time" : "Date"}
                        </th>
                        <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {orders.map((order) => {
                        const statusCfg =
                            STATUS_CONFIG[order.status] ||
                            STATUS_CONFIG.pending;
                        const paymentCfg =
                            PAYMENT_CONFIG[order.paymentMethod] ||
                            PAYMENT_CONFIG.cod;
                        const productsSummary =
                            order.products
                                ?.map((p) => p.name)
                                .slice(0, 2)
                                .join(", ") || "—";
                        const moreProducts =
                            (order.products?.length || 0) > 2
                                ? ` +${order.products.length - 2}`
                                : "";

                        return (
                            <tr
                                key={order._id}
                                className="hover:bg-gray-50/50 transition-colors group"
                            >
                                <td className="py-3.5 px-5">
                                    <span className="font-mono text-xs font-semibold text-purple-600">
                                        {order.orderId}
                                    </span>
                                </td>
                                <td className="py-3.5 px-5">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">
                                            {order.shippingAddress?.name ||
                                                "—"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {order.shippingAddress?.phone ||
                                                ""}
                                        </p>
                                    </div>
                                </td>
                                <td className="py-3.5 px-5 hidden md:table-cell">
                                    <p className="text-gray-600 text-sm truncate max-w-[180px]">
                                        {productsSummary}
                                        {moreProducts && (
                                            <span className="text-gray-400 text-xs">
                                                {moreProducts}
                                            </span>
                                        )}
                                    </p>
                                </td>
                                <td className="py-3.5 px-5">
                                    <span className="font-semibold text-gray-800">
                                        {formatCurrency(order.total)}
                                    </span>
                                </td>
                                <td className="py-3.5 px-5 hidden sm:table-cell">
                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${paymentCfg.bg} ${paymentCfg.text}`}
                                    >
                                        {paymentCfg.label}
                                    </span>
                                </td>
                                <td className="py-3.5 px-5">
                                    <select
                                        value={order.status}
                                        onChange={(e) =>
                                            onStatusChange(
                                                order._id,
                                                e.target.value
                                            )
                                        }
                                        disabled={
                                            updatingStatus === order._id
                                        }
                                        className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} ${
                                            updatingStatus === order._id
                                                ? "opacity-50 cursor-wait"
                                                : ""
                                        }`}
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>
                                        <option value="confirmed">
                                            Confirmed
                                        </option>
                                        <option value="shipped">
                                            Shipped
                                        </option>
                                        <option value="delivered">
                                            Delivered
                                        </option>
                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                        <option value="returned">
                                            Returned
                                        </option>
                                    </select>
                                </td>
                                <td className="py-3.5 px-5 hidden lg:table-cell">
                                    <span className="text-xs text-gray-500">
                                        {showTimeAgo
                                            ? timeAgo(order.createdAt)
                                            : formatDate(order.createdAt)}
                                    </span>
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                    <button
                                        onClick={() => onView(order)}
                                        className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Order Detail Modal ───────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onStatusChange, updatingStatus }) {
    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const paymentCfg =
        PAYMENT_CONFIG[order.paymentMethod] || PAYMENT_CONFIG.cod;

    const statusTimeline = [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
    ];
    const currentIndex = statusTimeline.indexOf(order.status);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-modal-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-bold text-lg">
                            Order Details
                        </h2>
                        <p className="text-purple-200 text-sm font-mono">
                            {order.orderId}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto max-h-[calc(90vh-88px)] p-6 space-y-6">
                    {/* Status Timeline */}
                    {order.status !== "cancelled" &&
                        order.status !== "returned" && (
                            <div className="flex items-center justify-between px-2">
                                {statusTimeline.map((step, i) => (
                                    <div
                                        key={step}
                                        className="flex items-center flex-1"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                                    i <= currentIndex
                                                        ? "bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200"
                                                        : "bg-gray-100 text-gray-400"
                                                }`}
                                            >
                                                {i <= currentIndex
                                                    ? "✓"
                                                    : i + 1}
                                            </div>
                                            <span
                                                className={`text-[10px] mt-1.5 capitalize ${
                                                    i <= currentIndex
                                                        ? "text-purple-600 font-semibold"
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                {step}
                                            </span>
                                        </div>
                                        {i < statusTimeline.length - 1 && (
                                            <div
                                                className={`flex-1 h-0.5 mx-2 mb-5 ${
                                                    i < currentIndex
                                                        ? "bg-gradient-to-r from-purple-400 to-indigo-400"
                                                        : "bg-gray-200"
                                                }`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                    {/* Status + Date Row */}
                    <div className="flex flex-wrap gap-3">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                            />
                            {statusCfg.label}
                        </span>
                        <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${paymentCfg.bg} ${paymentCfg.text}`}
                        >
                            {paymentCfg.label}
                        </span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                            {formatDate(order.createdAt)}
                        </span>
                    </div>

                    {/* Products */}
                    <DetailSection title="Products">
                        <div className="divide-y divide-gray-100">
                            {order.products?.map((p, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 py-3"
                                >
                                    {p.image ? (
                                        <img
                                            src={p.image}
                                            alt={p.name}
                                            className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
                                            📦
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 text-sm truncate">
                                            {p.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {p.size && `Size: ${p.size}`}
                                            {p.size && p.color && " · "}
                                            {p.color && `Color: ${p.color}`}
                                            {(p.size || p.color) && " · "}
                                            Qty: {p.quantity || 1}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-gray-800 text-sm">
                                        {formatCurrency(p.price)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.amount)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Shipping</span>
                                <span>{formatCurrency(order.shipping)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-gray-800 pt-1">
                                <span>Total</span>
                                <span className="text-purple-600">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>
                        </div>
                    </DetailSection>

                    {/* Customer / Shipping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailSection title="Shipping Address">
                            <p className="font-medium text-gray-800">
                                {order.shippingAddress?.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {order.shippingAddress?.address}
                            </p>
                            <p className="text-sm text-gray-500">
                                {order.shippingAddress?.city},{" "}
                                {order.shippingAddress?.state}{" "}
                                {order.shippingAddress?.postalCode}
                            </p>
                            <p className="text-sm text-gray-500">
                                {order.shippingAddress?.country}
                            </p>
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-400">
                                    📧 {order.shippingAddress?.email}
                                </p>
                                <p className="text-xs text-gray-400">
                                    📞 {order.shippingAddress?.phone}
                                </p>
                            </div>
                        </DetailSection>

                        <DetailSection title="Billing Address">
                            <p className="font-medium text-gray-800">
                                {order.billingAddress?.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {order.billingAddress?.address}
                            </p>
                            <p className="text-sm text-gray-500">
                                {order.billingAddress?.city},{" "}
                                {order.billingAddress?.state}{" "}
                                {order.billingAddress?.postalCode}
                            </p>
                            <p className="text-sm text-gray-500">
                                {order.billingAddress?.country}
                            </p>
                        </DetailSection>
                    </div>

                    {/* Payment Info */}
                    <DetailSection title="Payment Information">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">
                                    Method
                                </p>
                                <p className="font-medium text-gray-800 mt-0.5 capitalize">
                                    {order.paymentMethod}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider">
                                    Status
                                </p>
                                <p className="font-medium text-gray-800 mt-0.5 capitalize">
                                    {order.paymentStatus}
                                </p>
                            </div>
                            {order.paymentId && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                                        Payment ID
                                    </p>
                                    <p className="font-mono text-xs text-gray-600 mt-0.5">
                                        {order.paymentId}
                                    </p>
                                </div>
                            )}
                            {order.trackingNumber && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                                        Tracking Number
                                    </p>
                                    <p className="font-mono text-xs text-gray-600 mt-0.5">
                                        {order.trackingNumber}
                                    </p>
                                </div>
                            )}
                        </div>
                    </DetailSection>

                    {/* Notes */}
                    {order.notes && (
                        <DetailSection title="Notes">
                            <p className="text-sm text-gray-600">
                                {order.notes}
                            </p>
                        </DetailSection>
                    )}

                    {/* Update Status */}
                    <DetailSection title="Update Status">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_CONFIG).map(
                                ([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() =>
                                            onStatusChange(order._id, key)
                                        }
                                        disabled={
                                            order.status === key ||
                                            updatingStatus === order._id
                                        }
                                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                                            order.status === key
                                                ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-${key === "pending" ? "amber" : key === "confirmed" ? "blue" : key === "shipped" ? "indigo" : key === "delivered" ? "emerald" : key === "cancelled" ? "red" : "gray"}-300`
                                                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        {cfg.label}
                                    </button>
                                )
                            )}
                        </div>
                    </DetailSection>
                </div>
            </div>
        </div>
    );
}

// ── Detail Section ───────────────────────────────────────────────────────
function DetailSection({ title, children }) {
    return (
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {title}
            </h3>
            {children}
        </div>
    );
}
