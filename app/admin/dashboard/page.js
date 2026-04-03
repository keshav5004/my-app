"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Users, ShoppingCart, Package, DollarSign, TrendingUp, CalendarDays, IndianRupee } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center shadow">
        {error}
      </div>
    );
  }

  const stats = data?.stats || {};
  const statusDist = data?.statusDistribution || {};
  const recentOrders = data?.recentOrders || [];

  // Calculate max for chart scaling
  const statusEntries = Object.entries(statusDist);
  const maxCount = Math.max(...statusEntries.map(([, c]) => c), 1);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back! Here{"'"}s what{"'"}s happening with your store.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={Package}
          gradient="from-blue-500 to-indigo-600"
          title="Total Products"
          value={stats.totalProducts}
          subtitle="In catalog"
        />
        <StatCard
          icon={ShoppingCart}
          gradient="from-emerald-500 to-green-600"
          title="Total Orders"
          value={stats.totalOrders}
          subtitle={`${stats.todayOrders || 0} today`}
        />
        <StatCard
          icon={Users}
          gradient="from-violet-500 to-purple-600"
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered"
        />
        <StatCard
          icon={IndianRupee}
          gradient="from-amber-500 to-orange-600"
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`₹${(stats.todayRevenue || 0).toLocaleString("en-IN")} today`}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Paid Revenue</p>
            <p className="text-2xl font-bold text-gray-800 mt-0.5">{formatCurrency(stats.paidRevenue)}</p>
            <p className="text-gray-400 text-xs mt-0.5">Confirmed payments</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium">Today{"'"}s Orders</p>
            <p className="text-2xl font-bold text-gray-800 mt-0.5">{stats.todayOrders || 0}</p>
            <p className="text-gray-400 text-xs mt-0.5">Revenue: {formatCurrency(stats.todayRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Order Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-5">Order Status Distribution</h3>
          {statusEntries.length > 0 ? (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500 w-20 capitalize">{status}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getStatusBarColor(status)} flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max((count / maxCount) * 100, 8)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
          )}
        </div>

        {/* Quick Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-5">Quick Summary</h3>
          <div className="space-y-4">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${getStatusDot(status)}`} />
                  <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                  <span className="text-xs text-gray-400">
                    ({((count / stats.totalOrders) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          <span className="text-xs text-gray-400">Last 10 orders</span>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="text-left border-b border-gray-100">
                <tr>
                  <th className="py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Order ID</th>
                  <th className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                  <th className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Product</th>
                  <th className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                  <th className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 text-indigo-600 font-medium text-xs">{order.orderId}</td>
                    <td className="text-gray-800">{order.customer}</td>
                    <td className="text-gray-600">
                      {order.product}
                      {order.productCount > 1 && (
                        <span className="text-gray-400 text-xs ml-1">+{order.productCount - 1}</span>
                      )}
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="font-semibold text-gray-800">{formatCurrency(order.amount)}</td>
                    <td className="text-gray-500 text-xs">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📦</p>
            <p className="text-sm">No orders yet</p>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ icon: Icon, gradient, title, value, subtitle }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1.5">{value}</h2>
          <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="text-white w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function getStatusBarColor(status) {
  const map = {
    pending: "bg-yellow-500",
    confirmed: "bg-blue-500",
    shipped: "bg-purple-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
    returned: "bg-gray-500",
  };
  return map[status] || "bg-indigo-500";
}

function getStatusDot(status) {
  const map = {
    pending: "bg-yellow-500",
    confirmed: "bg-blue-500",
    shipped: "bg-purple-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
    returned: "bg-gray-500",
  };
  return map[status] || "bg-indigo-500";
}

function getStatusStyle(status) {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    returned: "bg-gray-100 text-gray-600",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}
