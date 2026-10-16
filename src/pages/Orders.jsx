import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { databaseRequest } from "../firebase/rest";
import { useAuth } from "../state/AuthContext";

const ORDER_STATUSES = ["Pending", "Shipped", "Delivered", "Canceled"];
const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Shipped: "bg-blue-50 text-blue-800 ring-blue-200",
  Delivered: "bg-green-50 text-green-800 ring-green-200",
  Canceled: "bg-red-50 text-red-800 ring-red-200",
};
const inputClass =
  "min-h-11 rounded-xl border border-[#dedfd8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15";

function toStatus(value) {
  const normalized = String(value || "Pending")
    .trim()
    .toLowerCase();
  if (["cancelled", "canceled"].includes(normalized)) return "Canceled";
  if (normalized === "shipped" || normalized === "dispatched") return "Shipped";
  if (["delivered", "complete", "completed"].includes(normalized))
    return "Delivered";
  return "Pending";
}

function isOrderRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return [
    "items",
    "orderItems",
    "cartItems",
    "total",
    "totalAmount",
    "grandTotal",
    "createdAt",
    "orderDate",
    "paymentMethod",
    "orderStatus",
    "status",
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function collectOrders(root) {
  if (!root || typeof root !== "object") return [];
  const result = [];

  function visit(node, uid, pathParts) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        if (isOrderRecord(entry)) {
          result.push(makeOrder(entry, uid, pathParts.concat(String(index))));
        } else {
          visit(entry, uid, pathParts.concat(String(index)));
        }
      });
      return;
    }
    if (isOrderRecord(node)) {
      result.push(makeOrder(node, uid, pathParts));
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      visit(value, uid, pathParts.concat(key));
    });
  }

  Object.entries(root).forEach(([uid, userOrders]) => {
    if (isOrderRecord(userOrders)) {
      // Supports a single order stored directly at customerOrders/{uid}.
      result.push(makeOrder(userOrders, uid, []));
    } else {
      visit(userOrders, uid, []);
    }
  });

  return result.sort((a, b) => b.createdAtMs - a.createdAtMs);
}


function makeOrder(raw, uid, pathParts) {
  const id = raw.orderId || raw.id || pathParts[pathParts.length - 1] || uid;

  const items =
    raw.items || raw.orderItems || raw.cartItems || raw.products || [];

  const itemList = Array.isArray(items)
    ? items
    : items && typeof items === "object"
      ? Object.entries(items).map(([key, item]) => ({
          id: key,
          ...item,
        }))
      : [];

  const total = Number(
    raw.totalAmount ??
      raw.grandTotal ??
      raw.total ??
      raw.amount ??
      raw.orderTotal ??
      0
  );

  const createdRaw =
    raw.createdAt ?? raw.orderDate ?? raw.timestamp ?? raw.date ?? null;

  const createdAtMs = parseDate(createdRaw);

  // Your checkout saves delivery details inside raw.customer.
  const customer = raw.customer || {};
  const shippingAddress =
    raw.shippingAddress || raw.address || raw.deliveryAddress || {};

  const customerName =
    customer.fullName ||
    customer.name ||
    raw.customerName ||
    raw.name ||
    shippingAddress.fullName ||
    raw.userName ||
    "Customer";

  const email =
    customer.email ||
    raw.email ||
    raw.customerEmail ||
    shippingAddress.email ||
    "";

  const phone =
    customer.phone ||
    raw.phone ||
    raw.customerPhone ||
    shippingAddress.phone ||
    "";

  const address = [
    customer.address ||
      shippingAddress.addressLine1 ||
      shippingAddress.address ||
      shippingAddress.street,
    shippingAddress.addressLine2,
    customer.city || shippingAddress.city,
    customer.state || shippingAddress.state,
    customer.pinCode ||
      shippingAddress.postalCode ||
      shippingAddress.pincode ||
      shippingAddress.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: String(id),
    uid,
    path: `customerOrders/${[uid, ...pathParts].filter(Boolean).join("/")}`,
    raw,
    items: itemList,
    total,
    status: toStatus(raw.status ?? raw.orderStatus),
    statusField: Object.prototype.hasOwnProperty.call(raw, "status")
      ? "status"
      : "orderStatus",
    paymentMethod: raw.paymentMethod || raw.paymentType || "Not specified",
    customerName,
    email,
    phone,
    address,
    createdRaw,
    createdAtMs,
  };
}


function parseDate(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const number = Number(value);
    return number < 1e12 ? number * 1000 : number;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address !== "object") return String(address);
  return [
    address.addressLine1 || address.address || address.street,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode || address.pincode || address.zip,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "Date not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getItemName(item) {
  return (
    item?.name ||
    item?.title ||
    item?.productName ||
    item?.product?.name ||
    "Product"
  );
}
function getItemQuantity(item) {
  return Number(item?.quantity ?? item?.qty ?? item?.count ?? 1) || 1;
}
function getItemPrice(item) {
  return (
    Number(item?.price ?? item?.salePrice ?? item?.product?.price ?? 0) || 0
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await databaseRequest(
        "customerOrders",
        "GET",
        user?.idToken,
      );
      setOrders(collectOrders(data));
    } catch (err) {
      setError(err.message || "Could not load customer orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All statuses" || order.status === statusFilter;
      const matchesQuery =
        !query ||
        [
          order.id,
          order.uid,
          order.customerName,
          order.email,
          order.phone,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
      return matchesStatus && matchesQuery;
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((order) => order.status === "Pending").length,
      shipped: orders.filter((order) => order.status === "Shipped").length,
      delivered: orders.filter((order) => order.status === "Delivered").length,
    }),
    [orders],
  );

  async function updateStatus(order, nextStatus) {
    if (nextStatus === order.status) return;
    

    setUpdatingId(order.id);
    setError("");
    setNotice("");
    try {
      await databaseRequest(order.path, "PATCH", user?.idToken, {
        [order.statusField]: nextStatus,
      });
      setOrders((current) =>
        current.map((item) =>
          item.path === order.path
            ? {
                ...item,
                status: nextStatus,
                raw: { ...item.raw, [order.statusField]: nextStatus },
              }
            : item,
        ),
      );
      setNotice(`Order ${order.id} updated to ${nextStatus}.`);
    } catch (err) {
      setError(
        `${err.message || "Could not update order status."} If this is a permission error, check the admin read/write rules for customerOrders.`,
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminLayout title="Orders">
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.8px] text-[#8a806f]">
              Order operations
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Customer orders
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[#77776e]">
              Review purchases and keep customers informed as orders move
              through delivery.
            </p>
          </div>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#d9ddd5] bg-white px-4 py-2.5 text-sm font-semibold text-[#263e32] shadow-sm transition hover:bg-[#f8faf7] disabled:opacity-60 sm:self-auto"
          >
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            Refresh orders
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="Total orders"
            value={loading ? "—" : counts.total}
            icon={<ShoppingBag size={19} />}
          />
          <SummaryCard
            label="Pending"
            value={loading ? "—" : counts.pending}
            icon={<Clock3 size={19} />}
          />
          <SummaryCard
            label="Shipped"
            value={loading ? "—" : counts.shipped}
            icon={<Truck size={19} />}
          />
          <SummaryCard
            label="Delivered"
            value={loading ? "—" : counts.delivered}
            icon={<PackageCheck size={19} />}
          />
        </div>

        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-800"
          >
            <CheckCircle2 size={18} />
            {notice}
            <button
              className="ml-auto"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              <XCircle size={17} />
            </button>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Order operation failed</p>
              <p>{error}</p>
              <button
                onClick={loadOrders}
                className="mt-1 font-bold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[#e7e6df] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative block min-w-0 flex-1">
              <Search
                size={19}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#85877e]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID, customer, email, or phone"
                className={`${inputClass} w-full pl-11`}
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClass} md:min-w-48`}
            >
              <option>All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#77776e]">
              <LoaderCircle size={21} className="animate-spin" />
              Loading orders from Firebase…
            </div>
          ) : error && orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#77776e]">
              Orders could not be loaded. Check the Firebase rules for
              administrator access.
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef1eb] text-[#526d58]">
                <ShoppingBag size={26} />
              </span>
              <h3 className="mt-4 text-xl font-semibold">No orders found</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#77776e]">
                No records were found under{" "}
                <code className="rounded bg-[#f2f2ed] px-1.5 py-0.5">
                  customerOrders
                </code>
                . New storefront orders will appear here when the database path
                and rules permit administrator reads.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-14 text-center text-sm text-[#77776e]">
              No orders match your search or status filter.
            </div>
          ) : (
            <>
              <p className="mt-5 text-sm text-[#77776e]">
                Showing{" "}
                <strong className="text-[#292820]">
                  {filteredOrders.length}
                </strong>{" "}
                of <strong className="text-[#292820]">{orders.length}</strong>{" "}
                orders
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#e9e8e2]">
                <table className="w-full min-w-[950px] border-collapse text-left">
                  <thead className="bg-[#f7f7f3] text-xs font-bold uppercase tracking-wider text-[#77776e]">
                    <tr>
                      <th className="px-4 py-4">Order</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Payment</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeede7]">
                    {filteredOrders.map((order) => (
                      <FragmentOrderRow
                        key={order.path}
                        order={order}
                        expanded={expandedId === order.path}
                        onToggle={() =>
                          setExpandedId(
                            expandedId === order.path ? null : order.path,
                          )
                        }
                        onStatusChange={updateStatus}
                        updating={updatingId === order.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="rounded-xl border border-[#e4dcc9] bg-[#f4f0e6] px-4 py-3.5 text-sm leading-6 text-[#665e4d]">
          <strong>Security note:</strong> Order data is customer-sensitive. Only
          the authenticated admin should be able to list all customers' orders
          and change order status. Do not make the entire{" "}
          <code>customerOrders</code> node publicly readable or writable.
        </div>
      </section>
    </AdminLayout>
  );
}

function FragmentOrderRow({
  order,
  expanded,
  onToggle,
  onStatusChange,
  updating,
}) {
  return (
    <>
      <tr className="bg-white align-top transition hover:bg-[#fcfcfa]">
        <td className="px-4 py-4">
          <p className="text-sm font-semibold text-[#292820]">{order.id}</p>
          <p className="mt-1 max-w-40 truncate text-xs text-[#8a8b81]">
            UID: {order.uid}
          </p>
        </td>
        <td className="px-4 py-4">
          <p className="text-sm font-semibold text-[#292820]">
            {order.customerName}
          </p>
          <p className="mt-1 text-xs text-[#77776e]">
            {order.email || order.phone || "Contact not provided"}
          </p>
        </td>
        <td className="px-4 py-4 text-sm text-[#66675e]">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={15} />
            {formatDate(order.createdRaw)}
          </span>
        </td>
        <td className="px-4 py-4 text-sm font-semibold tabular-nums text-[#292820]">
          {formatPrice(order.total)}
        </td>
        <td className="px-4 py-4 text-sm text-[#66675e]">
          {order.paymentMethod}
        </td>
        <td className="px-4 py-4">
          <div className="grid gap-2">
            <span
              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
            <select
              aria-label={`Update status for order ${order.id}`}
              value={order.status}
              disabled={updating}
              onChange={(event) => onStatusChange(order, event.target.value)}
              className="min-h-9 max-w-36 rounded-lg border border-[#dedfd8] bg-white px-2 text-xs outline-none focus:border-[#526d58] disabled:opacity-60"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            {updating && (
              <span className="text-xs text-[#77776e]">Saving…</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4">
          <button
            onClick={onToggle}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#dedfd8] px-3 text-xs font-semibold text-[#263e32] hover:bg-[#f8faf7]"
          >
            {expanded ? "Hide" : "View"}
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#fbfbf8]">
          <td colSpan={7} className="px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <h4 className="text-sm font-bold text-[#292820]">
                  Items ({order.items.length})
                </h4>
                {order.items.length ? (
                  <div className="mt-3 divide-y divide-[#e9e8e2] rounded-xl border border-[#e9e8e2] bg-white">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id || item.productId || index}
                        className="flex items-center justify-between gap-4 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#292820]">
                            {getItemName(item)}
                          </p>
                          <p className="mt-1 text-xs text-[#77776e]">
                            Qty: {getItemQuantity(item)} ×{" "}
                            {formatPrice(getItemPrice(item))}
                          </p>
                        </div>
                        <strong className="shrink-0 text-sm tabular-nums">
                          {formatPrice(
                            getItemQuantity(item) * getItemPrice(item),
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#77776e]">
                    No item details were found in this order record.
                  </p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#292820]">
                  Customer & delivery
                </h4>
                <div className="mt-3 space-y-2 rounded-xl border border-[#e9e8e2] bg-white p-4 text-sm">
                  <p>
                    <span className="text-[#77776e]">Name:</span>{" "}
                    {order.customerName}
                  </p>
                  <p>
                    <span className="text-[#77776e]">Email:</span>{" "}
                    {order.email || "Not provided"}
                  </p>
                  <p>
                    <span className="text-[#77776e]">Phone:</span>{" "}
                    {order.phone || "Not provided"}
                  </p>
                  <p>
                    <span className="text-[#77776e]">Address:</span>{" "}
                    {order.address || "Not provided"}
                  </p>
                  <p>
                    <span className="text-[#77776e]">Payment:</span>{" "}
                    {order.paymentMethod}
                  </p>
                  <p>
                    <span className="text-[#77776e]">Order total:</span>{" "}
                    <strong>{formatPrice(order.total)}</strong>
                  </p>
                  <p className="break-all">
                    <span className="text-[#77776e]">Customer UID:</span>{" "}
                    {order.uid}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <article className="rounded-2xl border border-[#e7e6df] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#77776e]">{label}</p>
        <span className="text-[#526d58]">{icon}</span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[#292820]">
        {value}
      </p>
    </article>
  );
}
