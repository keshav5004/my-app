"use client";

import { useState, useMemo, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [yesterdayPayments, setYesterdayPayments] = useState([]);
  const [olderPayments, setOlderPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Active section tab
  const [activeSection, setActiveSection] = useState("today");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPayments();
      setPayments(data.payments || []);
      setTodayPayments(data.todayPayments || []);
      setYesterdayPayments(data.yesterdayPayments || []);
      setOlderPayments(data.olderPayments || []);
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  // Compute stats for a given list of payments
  const computeStats = (list) => {
    const totalRevenue = list
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const onlineRevenue = list
      .filter((p) => p.method === "Online" && p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const codRevenue = list
      .filter((p) => p.method === "COD" && p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = list
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOrders = list.length;
    const paidCount = list.filter((p) => p.status === "paid").length;
    const pendingCount = list.filter((p) => p.status === "pending").length;
    const refundedCount = list.filter((p) => p.status === "refunded").length;

    return { totalRevenue, onlineRevenue, codRevenue, pendingAmount, totalOrders, paidCount, pendingCount, refundedCount };
  };

  const overallStats = useMemo(() => computeStats(payments), [payments]);
  const todayStats = useMemo(() => computeStats(todayPayments), [todayPayments]);
  const yesterdayStats = useMemo(() => computeStats(yesterdayPayments), [yesterdayPayments]);
  const olderStats = useMemo(() => computeStats(olderPayments), [olderPayments]);

  const updateStatusInLists = (id, newStatus, list) => {
    return list.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await apiClient.updatePaymentStatus(id, newStatus);
      setPayments(updateStatusInLists(id, newStatus, payments));
      setTodayPayments(updateStatusInLists(id, newStatus, todayPayments));
      setYesterdayPayments(updateStatusInLists(id, newStatus, yesterdayPayments));
      setOlderPayments(updateStatusInLists(id, newStatus, olderPayments));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update payment status");
    }
  };

  const applyFilters = (list) => {
    return list
      .filter((p) => p.id.toLowerCase().includes(search.toLowerCase()) || p.orderId.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => (filterMethod ? p.method === filterMethod : true))
      .filter((p) => (filterStatus ? p.status === filterStatus : true));
  };

  const filteredToday = applyFilters(todayPayments);
  const filteredYesterday = applyFilters(yesterdayPayments);
  const filteredOlder = applyFilters(olderPayments);

  const sections = [
    { key: "today", label: "Today", icon: "☀️", payments: filteredToday, stats: todayStats, rawCount: todayPayments.length },
    { key: "yesterday", label: "Previous Day", icon: "📅", payments: filteredYesterday, stats: yesterdayStats, rawCount: yesterdayPayments.length },
    { key: "older", label: "All Previous", icon: "📦", payments: filteredOlder, stats: olderStats, rawCount: olderPayments.length },
  ];

  const activeData = sections.find((s) => s.key === activeSection);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Payment Details
          </h1>
          <p className="text-gray-500">Live payment tracking & analytics</p>
        </div>

        <button 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          onClick={() => apiClient.exportPayments()}
        >
          📥 Export Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-indigo-600">
           <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center shadow">
          {error}
        </div>
      ) : (
        <>
          {/* Stats Cards - Updates based on active tab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <OverviewCard 
              title="Total Revenue" 
              value={`₹${activeData.stats.totalRevenue.toLocaleString('en-IN')}`} 
              subtitle={`${activeData.stats.paidCount} paid orders`}
              gradient="from-emerald-500 to-green-600"
              icon="💰"
            />
            <OverviewCard 
              title="Online Payments" 
              value={`₹${activeData.stats.onlineRevenue.toLocaleString('en-IN')}`} 
              subtitle="Online / UPI / Card"
              gradient="from-blue-500 to-indigo-600"
              icon="💳"
            />
            <OverviewCard 
              title="Cash on Delivery" 
              value={`₹${activeData.stats.codRevenue.toLocaleString('en-IN')}`} 
              subtitle="COD collections"
              gradient="from-amber-500 to-orange-600"
              icon="🏦"
            />
            <OverviewCard 
              title="Pending" 
              value={`₹${activeData.stats.pendingAmount.toLocaleString('en-IN')}`} 
              subtitle={`${activeData.stats.pendingCount} pending orders`}
              gradient="from-rose-500 to-red-600"
              icon="⏳"
            />
          </div>

          {/* Section Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {sections.map((sec) => (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                  activeSection === sec.key
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeSection === sec.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {sec.rawCount}
                </span>
              </button>
            ))}
          </div>



          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 text-black">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search by Payment or Order ID..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none cursor-pointer"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="">All Methods</option>
              <option>Online</option>
              <option>COD</option>
            </select>

            <select
              className="px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option>paid</option>
              <option>pending</option>
              <option>refunded</option>
            </select>
          </div>

          {/* Active Section Payment Table */}
          {activeData && (
            <PaymentSection 
              title={`${activeData.icon} ${activeData.label} Payments`} 
              payments={activeData.payments} 
              updateStatus={updateStatus} 
            />
          )}
        </>
      )}
    </>
  );
}

function PaymentSection({ title, payments, updateStatus }) {
  return (
    <div className="mb-10 text-black">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title} ({payments.length})</h2>
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 font-medium text-lg">No payments found</p>
          <p className="text-gray-400 text-sm mt-1">No payment records match your current filters for this period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg shadow-gray-100 border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-left text-gray-500 border-b bg-gray-50/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Payment ID</th>
                <th className="font-semibold">Order ID</th>
                <th className="font-semibold">Customer</th>
                <th className="font-semibold">Amount</th>
                <th className="font-semibold">Method</th>
                <th className="font-semibold">Status</th>
                <th className="font-semibold">Date</th>
                <th className="font-semibold">Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, idx) => (
                <tr key={payment.id} className={`border-b hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-3.5 px-4 text-gray-400 text-xs font-mono">{payment.id.slice(-8)}</td>
                  <td className="font-semibold text-gray-900">{payment.orderId}</td>
                  <td className="text-gray-700">{payment.customer}</td>
                  <td className="font-bold text-emerald-600">₹{payment.amount.toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      payment.method === 'Online' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {payment.method === 'Online' ? '💳' : '💵'} {payment.method}
                    </span>
                  </td>
                  <td>
                    <StatusSelect 
                      currentStatus={payment.status} 
                      onChange={(newStatus) => updateStatus(payment.id, newStatus)} 
                    />
                  </td>
                  <td className="text-gray-500">{payment.date}</td>
                  <td className="text-gray-400 text-xs font-mono">{payment.transactionId || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusSelect({ currentStatus, onChange }) {
  const statusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "refunded":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <select
      value={currentStatus}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-1.5 rounded-full text-xs font-bold outline-none cursor-pointer border ${statusColor(currentStatus)}`}
    >
      <option value="paid">paid</option>
      <option value="pending">pending</option>
      <option value="refunded">refunded</option>
    </select>
  );
}

function OverviewCard({ title, value, subtitle, gradient, icon }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-5 rounded-2xl shadow-lg text-white transition-all hover:shadow-xl hover:-translate-y-1`}>
      <div className="absolute top-3 right-3 text-3xl opacity-30">{icon}</div>
      <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <h2 className="text-2xl font-extrabold mt-1.5">{value}</h2>
      <p className="text-white/60 text-xs mt-1">{subtitle}</p>
    </div>
  );
}


