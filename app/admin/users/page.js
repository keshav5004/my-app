"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const fetchUsers = useCallback(async (searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getUsers(searchTerm);
      setUsers(data.users || []);
      setStats(data.stats || { totalUsers: 0, activeUsers: 0, totalRevenue: 0 });
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      fetchUsers(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, fetchUsers]);

  const openDetail = async (user) => {
    setSelectedUser(user);
    setDetailData(null);
    setDetailLoading(true);
    setIsEditing(false);
    setEditError("");
    setEditSuccess("");
    try {
      const data = await fetch(`/api/users/${user._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }).then((r) => r.json());
      setDetailData(data.user);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedUser(null);
    setDetailData(null);
    setIsEditing(false);
    setEditError("");
    setEditSuccess("");
  };

  const startEditing = () => {
    if (!detailData) return;
    const defaultAddr = detailData.addresses?.find((a) => a.isDefault) || detailData.addresses?.[0] || {};
    setEditForm({
      name: detailData.name || "",
      email: detailData.email || "",
      phone: defaultAddr.phone || "",
      address: defaultAddr.address || "",
      city: defaultAddr.city || "",
      state: defaultAddr.state || "",
      postalCode: defaultAddr.postalCode || "",
      country: defaultAddr.country || "India",
    });
    setIsEditing(true);
    setEditError("");
    setEditSuccess("");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError("");
    setEditSuccess("");
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editForm.name?.trim()) {
      setEditError("Name is required");
      return;
    }
    if (!editForm.email?.trim()) {
      setEditError("Email is required");
      return;
    }

    try {
      setEditLoading(true);
      setEditError("");
      setEditSuccess("");

      await apiClient.updateUser(selectedUser._id, editForm);

      setEditSuccess("User updated successfully!");
      setIsEditing(false);

      // Refresh the detail data
      const data = await fetch(`/api/users/${selectedUser._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }).then((r) => r.json());
      setDetailData(data.user);

      // Also refresh the user list
      fetchUsers(search);

      // Clear success after 3s
      setTimeout(() => setEditSuccess(""), 3000);
    } catch (err) {
      setEditError(err.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString("en-IN")}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getAvatarColor = (name = "") => {
    const colors = [
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-rose-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-cyan-500 to-sky-600",
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Users Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            View and manage all registered customers
          </p>
        </div>
        <button
          onClick={() => fetchUsers(search)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon="👥"
          title="Total Users"
          value={stats.totalUsers}
          sub="Registered accounts"
          gradient="from-indigo-500 to-purple-500"
        />
        <StatCard
          icon="✅"
          title="Active Buyers"
          value={stats.activeUsers}
          sub="Users with orders"
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon="💰"
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          sub="From all orders"
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            type="text"
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white shadow-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="text-5xl mb-2">👤</div>
            <p className="text-gray-500 font-medium">No users found</p>
            <p className="text-gray-400 text-sm">
              {search ? "Try a different search term" : "No registered users yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-5 text-gray-500 font-semibold">User</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Location</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Orders</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Total Spent</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Joined</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors"
                  >
                    {/* Avatar + Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(
                            user.name
                          )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium text-gray-800">{user.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">{user.email}</td>

                    <td className="py-3.5 px-4 text-gray-600">
                      {user.phone || <span className="text-gray-300">—</span>}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">
                      {user.city ? (
                        <span>
                          {user.city}
                          {user.state ? `, ${user.state}` : ""}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.orderCount > 0
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.orderCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {formatCurrency(user.totalSpent)}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetail(user)}
                          className="px-3 py-1.5 text-indigo-600 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            openDetail(user);
                            // Start editing after detail loads
                            setTimeout(() => startEditing(), 500);
                          }}
                          className="px-3 py-1.5 text-amber-600 text-xs font-medium bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row count */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Detail / Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(
                    selectedUser.name
                  )} flex items-center justify-center text-white font-bold`}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 text-lg">
                    {isEditing ? "Edit User" : (detailData?.name || selectedUser.name)}
                  </h2>
                  <p className="text-gray-400 text-sm">{detailData?.email || selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && detailData && (
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  onClick={closeDetail}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detailData ? (
                <div className="space-y-6">
                  {/* Success / Error Messages */}
                  {editSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-pulse">
                      <span>✅</span> {editSuccess}
                    </div>
                  )}
                  {editError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                      <span>⚠️</span> {editError}
                    </div>
                  )}

                  {isEditing ? (
                    /* ====== EDIT FORM ====== */
                    <div className="space-y-5">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
                        <span>✏️</span>
                        <span>Editing user profile — changes will reflect in the user{"'"}s account</span>
                      </div>

                      {/* Personal Info */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-xs">👤</span>
                          Personal Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <EditField
                            label="Full Name"
                            value={editForm.name}
                            onChange={(v) => handleEditChange("name", v)}
                            placeholder="Enter full name"
                            required
                          />
                          <EditField
                            label="Email Address"
                            value={editForm.email}
                            onChange={(v) => handleEditChange("email", v)}
                            placeholder="Enter email"
                            type="email"
                            required
                          />
                        </div>
                      </div>

                      {/* Contact & Address */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-xs">📍</span>
                          Contact & Address
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <EditField
                            label="Phone Number"
                            value={editForm.phone}
                            onChange={(v) => handleEditChange("phone", v)}
                            placeholder="Enter phone number"
                          />
                          <EditField
                            label="Country"
                            value={editForm.country}
                            onChange={(v) => handleEditChange("country", v)}
                            placeholder="Enter country"
                          />
                          <div className="col-span-2">
                            <EditField
                              label="Street Address"
                              value={editForm.address}
                              onChange={(v) => handleEditChange("address", v)}
                              placeholder="Enter street address"
                            />
                          </div>
                          <EditField
                            label="City"
                            value={editForm.city}
                            onChange={(v) => handleEditChange("city", v)}
                            placeholder="Enter city"
                          />
                          <EditField
                            label="State"
                            value={editForm.state}
                            onChange={(v) => handleEditChange("state", v)}
                            placeholder="Enter state"
                          />
                          <EditField
                            label="Postal Code"
                            value={editForm.postalCode}
                            onChange={(v) => handleEditChange("postalCode", v)}
                            placeholder="Enter postal code"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={cancelEditing}
                          disabled={editLoading}
                          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={editLoading}
                          className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                        >
                          {editLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>💾 Save Changes</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ====== VIEW MODE ====== */
                    <div className="space-y-6">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-indigo-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-indigo-700">
                            {detailData.orderCount}
                          </p>
                          <p className="text-xs text-indigo-500 mt-1">Orders</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-emerald-700">
                            {formatCurrency(detailData.totalSpent)}
                          </p>
                          <p className="text-xs text-emerald-500 mt-1">Total Spent</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-amber-700">
                            {formatDate(detailData.createdAt)}
                          </p>
                          <p className="text-xs text-amber-500 mt-1">Joined</p>
                        </div>
                      </div>

                      {/* Addresses */}
                      {detailData.addresses && detailData.addresses.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Saved Addresses ({detailData.addresses.length})
                          </h3>
                          <div className="space-y-2">
                            {detailData.addresses.map((addr) => (
                              <div
                                key={addr._id}
                                className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 flex items-start gap-3"
                              >
                                <span className="text-base flex-shrink-0">📍</span>
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {addr.name}
                                    {addr.isDefault && (
                                      <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                                        Default
                                      </span>
                                    )}
                                  </p>
                                  <p>{addr.phone}</p>
                                  <p>
                                    {addr.address}, {addr.city}, {addr.state}{" "}
                                    {addr.postalCode}
                                  </p>
                                  <p>{addr.country}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Orders */}
                      {detailData.orders && detailData.orders.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Recent Orders
                          </h3>
                          <div className="space-y-2">
                            {detailData.orders.slice(0, 5).map((order) => (
                              <div
                                key={order._id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm"
                              >
                                <div>
                                  <p className="font-medium text-gray-800">
                                    #{order.orderId}
                                  </p>
                                  <p className="text-gray-400 text-xs">
                                    {formatDate(order.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-800">
                                    {formatCurrency(order.total)}
                                  </p>
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusStyle(
                                      order.status
                                    )}`}
                                  >
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {detailData.orders.length > 5 && (
                              <p className="text-xs text-gray-400 text-center pt-1">
                                +{detailData.orders.length - 5} more orders
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {detailData.orders?.length === 0 && detailData.addresses?.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-4xl mb-2">📭</p>
                          <p className="text-sm">No orders or addresses yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">
                  Failed to load user details
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EditField({ label, value, onChange, placeholder, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-all"
      />
    </div>
  );
}

function StatCard({ icon, title, value, sub, gradient }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}
      >
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-xs font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
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
