import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  Tags,
  TrendingUp,
  Truck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { databaseRequest } from "../firebase/rest";
import { useAuth } from "../state/AuthContext";

function entries(value) {
  if (!value || typeof value !== "object") return [];
  const source = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  return source
    .filter(
      ([, item]) => item && typeof item === "object" && !Array.isArray(item),
    )
    .map(([key, item]) => ({ key, ...item }));
}

function toStatus(value) {
  const status = String(value || "Pending")
    .trim()
    .toLowerCase();
  if (["cancelled", "canceled"].includes(status)) return "Canceled";
  if (["shipped", "dispatched"].includes(status)) return "Shipped";
  if (["delivered", "complete", "completed"].includes(status))
    return "Delivered";
  return "Pending";
}

function getOrderDate(order) {
  const value =
    order.createdAt ?? order.orderDate ?? order.timestamp ?? order.date;
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (/^\d+$/.test(String(value))) {
    const number = Number(value);
    return number < 1e12 ? number * 1000 : number;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function collectOrders(root) {
  const orders = [];
  if (!root || typeof root !== "object") return orders;

  for (const [uid, userOrders] of Object.entries(root)) {
    if (!userOrders || typeof userOrders !== "object") continue;
    // Standard storefront path: customerOrders/{uid}/{orderId}.
    for (const [orderId, raw] of Object.entries(userOrders)) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const hasOrderFields = [
        "items",
        "orderItems",
        "cartItems",
        "total",
        "totalAmount",
        "grandTotal",
        "createdAt",
        "orderStatus",
        "status",
      ].some((key) => Object.prototype.hasOwnProperty.call(raw, key));
      if (!hasOrderFields) continue;
      const itemSource =
        raw.items || raw.orderItems || raw.cartItems || raw.products || [];
      const items = Array.isArray(itemSource)
        ? itemSource
        : entries(itemSource);
      const total =
        Number(
          raw.totalAmount ??
            raw.grandTotal ??
            raw.total ??
            raw.amount ??
            raw.orderTotal ??
            0,
        ) || 0;
      const createdAtMs = getOrderDate(raw);
      orders.push({
        id: String(raw.orderId || raw.id || orderId),
        uid: raw.userId || uid,
        total,
        status: toStatus(raw.orderStatus ?? raw.status),
        paymentMethod: raw.paymentMethod || raw.paymentType || "Not specified",
        createdAtMs,
        items,
        customerName:
          raw.customer?.fullName || raw.customerName || raw.name || "Customer",
      });
    }
  }
  return orders.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const statusStyles = {
  Pending: "bg-amber-50 text-amber-800",
  Shipped: "bg-blue-50 text-blue-800",
  Delivered: "bg-green-50 text-green-800",
  Canceled: "bg-red-50 text-red-800",
};

function MetricCard({ label, value, note, icon: Icon, to }) {
  const content = (
    <article className="h-full rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm transition hover:border-[#cbd5c8] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#666a60] sm:text-base">
          {label}
        </p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf1eb] text-[#526d58]">
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-5 font-display text-3xl font-semibold tabular-nums text-[#292820] sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#77776e]">{note}</p>
    </article>
  );
  return to ? (
    <Link to={to} className="block no-underline">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, categoryData, orderData] = await Promise.all([
        databaseRequest("products", "GET", user?.idToken),
        databaseRequest("categories", "GET", user?.idToken),
        databaseRequest("customerOrders", "GET", user?.idToken),
      ]);
      setProducts(
        entries(productData).map((item) => ({
          ...item,
          quantity: Number(
            item.stockQuantity ??
              item.quantity ??
              item.stock ??
              item.inventory ??
              0,
          ),
          isActive: item.isActive !== false,
        })),
      );
      setCategories(
        entries(categoryData).map((item) => ({
          ...item,
          isActive: item.isActive !== false,
        })),
      );
      setOrders(collectOrders(orderData));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "Pending").length;
    const delivered = orders.filter((order) => order.status === "Delivered");
    const lowStock = products.filter(
      (product) =>
        product.isActive && product.quantity > 0 && product.quantity <= 5,
    );
    const outOfStock = products.filter((product) => product.quantity <= 0);
    // Revenue is deliberately limited to delivered orders, not merely placed orders.
    const deliveredRevenue = delivered.reduce(
      (sum, order) => sum + order.total,
      0,
    );
    return {
      activeProducts: products.filter((product) => product.isActive).length,
      totalOrders: orders.length,
      pending,
      deliveredRevenue,
      lowStock,
      outOfStock,
      delivered: delivered.length,
      shipped: orders.filter((order) => order.status === "Shipped").length,
    };
  }, [products, orders]);

  const recentOrders = orders.slice(0, 6);

  return (
    <AdminLayout title="Overview">
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-[#dce4d9] bg-[#e8ede6] p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-bold tracking-[1.8px] text-[#7d806f]">
            YOUR STORE, AT A GLANCE
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-[#292820] sm:text-3xl">
            Welcome to your dashboard.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#667066]">
            Monitor your furniture catalog, track customer orders, and keep an
            eye on stock from one place.
          </p>
          {lastUpdated && (
            <p className="mt-3 text-sm text-[#667066]">
              Last updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#bdcbbb] bg-white px-4 py-2.5 text-sm font-semibold text-[#263e32] transition hover:bg-[#f8faf7] disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          Refresh overview
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              Dashboard data could not be fully loaded
            </p>
            <p>{error}</p>
            <p className="mt-1">
              Check your Firebase connection and admin read permissions, then
              try refreshing.
            </p>
          </div>
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active products"
          value={loading ? "—" : stats.activeProducts}
          note={`${products.length} total catalog items`}
          icon={Package}
          to="/products"
        />
        <MetricCard
          label="Orders received"
          value={loading ? "—" : stats.totalOrders}
          note={`${stats.pending} awaiting processing`}
          icon={ShoppingBag}
          to="/orders"
        />
        <MetricCard
          label="Delivered revenue"
          value={loading ? "—" : formatPrice(stats.deliveredRevenue)}
          note="Total value of delivered orders"
          icon={WalletCards}
          to="/orders"
        />
        <MetricCard
          label="Low-stock items"
          value={
            loading ? "—" : stats.lowStock.length + stats.outOfStock.length
          }
          note={`${stats.lowStock.length} low stock · ${stats.outOfStock.length} out of stock`}
          icon={Boxes}
          to="/products"
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-[#e7e6df] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeede7] px-5 py-5 sm:px-6">
            <div>
              <h3 className="text-xl font-semibold text-[#292820]">
                Recent orders
              </h3>
              <p className="mt-1 text-sm text-[#77776e]">
                Latest customer purchases from your store
              </p>
            </div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#405e47] hover:underline"
            >
              All orders <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#77776e]">
              <LoaderCircle size={19} className="animate-spin" />
              Loading orders…
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingBag className="mx-auto text-[#8b9b89]" size={30} />
              <p className="mt-3 text-base font-semibold text-[#292820]">
                No orders yet
              </p>
              <p className="mt-1 text-sm text-[#77776e]">
                New storefront orders will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eeede7]">
              {recentOrders.map((order) => (
                <div
                  key={`${order.uid}/${order.id}`}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#292820]">
                      {order.customerName}
                    </p>
                    <p className="mt-1 break-all text-xs text-[#77776e]">
                      #{order.id}
                    </p>
                    <p className="mt-1 text-sm text-[#77776e]">
                      {formatDate(order.createdAtMs)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[order.status]}`}
                    >
                      {order.status}
                    </span>
                    <strong className="whitespace-nowrap text-sm tabular-nums text-[#292820]">
                      {formatPrice(order.total)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf1eb] text-[#526d58]">
                <TrendingUp size={21} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[#292820]">
                  Order progress
                </h3>
                <p className="text-sm text-[#77776e]">
                  Current delivery pipeline
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Pending", stats.pending, "bg-amber-400"],
                ["Shipped", stats.shipped, "bg-blue-400"],
                ["Delivered", stats.delivered, "bg-green-500"],
              ].map(([label, count, color]) => (
                <div key={label}>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-[#55584f]">{label}</span>
                    <strong className="tabular-nums text-[#292820]">
                      {loading ? "—" : count}
                    </strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eff0eb]">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${orders.length ? Math.min(100, (count / orders.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/orders"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#405e47] hover:underline"
            >
              Manage orders <ArrowRight size={16} />
            </Link>
          </article>

          <article className="rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3efe5] text-[#8a7650]">
                <Package size={21} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[#292820]">
                  Inventory watch
                </h3>
                <p className="text-sm text-[#77776e]">
                  Products needing attention
                </p>
              </div>
            </div>
            {loading ? (
              <p className="mt-5 text-sm text-[#77776e]">Checking inventory…</p>
            ) : stats.lowStock.length + stats.outOfStock.length === 0 ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#edf4eb] p-3.5 text-sm font-medium text-[#3d6843]">
                <CheckCircle2 size={18} />
                All products have more than 5 units in stock.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {[
                  ...stats.outOfStock.map((p) => ({
                    ...p,
                    stockLabel: "Out of stock",
                  })),
                  ...stats.lowStock.map((p) => ({
                    ...p,
                    stockLabel: `${p.quantity} left`,
                  })),
                ]
                  .slice(0, 4)
                  .map((product) => (
                    <div
                      key={product.key || product.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#faf9f6] px-3.5 py-3"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-[#44463f]">
                        {product.name || product.title || product.key}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${product.quantity <= 0 ? "text-red-700" : "text-amber-700"}`}
                      >
                        {product.stockLabel}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            <Link
              to="/products"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#405e47] hover:underline"
            >
              Manage products <ArrowRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/products"
          className="group flex items-center gap-4 rounded-2xl border border-[#e7e6df] bg-white p-5 no-underline shadow-sm transition hover:border-[#cbd5c8] sm:p-6"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf1eb] text-[#526d58]">
            <Package size={23} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold text-[#292820]">
              Product catalog
            </strong>
            <span className="mt-1 block text-sm leading-6 text-[#77776e]">
              {loading
                ? "Loading catalog…"
                : `${products.length} products available in the catalog`}
            </span>
          </span>
          <ArrowRight
            className="shrink-0 text-[#526d58] transition group-hover:translate-x-1"
            size={19}
          />
        </Link>
        <Link
          to="/categories"
          className="group flex items-center gap-4 rounded-2xl border border-[#e7e6df] bg-white p-5 no-underline shadow-sm transition hover:border-[#cbd5c8] sm:p-6"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f3efe5] text-[#8a7650]">
            <Tags size={23} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold text-[#292820]">
              Store categories
            </strong>
            <span className="mt-1 block text-sm leading-6 text-[#77776e]">
              {loading
                ? "Loading categories…"
                : `${categories.length} categories · ${categories.filter((category) => category.isActive).length} active`}
            </span>
          </span>
          <ArrowRight
            className="shrink-0 text-[#526d58] transition group-hover:translate-x-1"
            size={19}
          />
        </Link>
      </section>

      <footer className="mt-6 flex flex-col gap-2 border-t border-[#e5e4dc] px-0.5 py-5 text-sm text-[#77776e] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold tracking-[1px]">
          CHINMAY STORE ADMIN
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock3 size={16} />
          {lastUpdated
            ? `Data refreshed ${lastUpdated.toLocaleString("en-IN")}`
            : "Waiting for dashboard data"}
        </span>
      </footer>
    </AdminLayout>
  );
}
