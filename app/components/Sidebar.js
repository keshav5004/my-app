"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "Overview", href: "/admin/dashboard" },
  { name: "Products", href: "/admin/products" },
  { name: "Orders", href: "/admin/orders" },
  { name: "Users", href: "/admin/users" },
  { name: "Payments", href: "/admin/payments" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="px-6 py-8 border-b border-gray-200 ">
        <h2 className="text-2xl font-bold text-indigo-600">Admin Panel</h2>
        <p className="text-sm text-black mt-2">Management Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-6 overflow-y-auto ">
        {links.map(({ name, href }) => {
          const isActive = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`block text-base transition ${
                isActive
                  ? "text-indigo-600 font-medium"
                  : "text-black font-medium hover:text-indigo-600"
              }`}
            >
              {name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 px-4 py-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
          <span className="text-black font-semibold text-sm">N</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Admin User</p>
          <p className="text-xs text-gray-400">admin@fitloom.com</p>
        </div>
      </div>
    </aside>
  );
}
