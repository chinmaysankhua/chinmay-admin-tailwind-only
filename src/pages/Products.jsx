import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ImageOff,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { databaseRequest } from "../firebase/rest";
import { useAuth } from "../state/AuthContext";

function normalizeRecords(value) {
  if (!value) return [];
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  return entries
    .filter(([, item]) => item && typeof item === "object")
    .map(([key, item]) => ({
      id: item.id || key,
      name: item.name || item.title || item.productName || "Untitled product",
      category:
        item.categoryName ||
        item.category ||
        item.categoryId ||
        "Uncategorized",
      price: Number(item.price ?? item.salePrice ?? item.sellingPrice ?? 0),

      quantity: Number(
        item.stockQuantity ??
          item.quantity ??
          item.stock ??
          item.inventory ??
          0,
      ),

      image:
        item.image ||
        item.imageUrl ||
        item.thumbnail ||
        item.thumbnailUrl ||
        item.images?.[0] ||
        "",

      status:
        Number(
          item.stockQuantity ??
            item.quantity ??
            item.stock ??
            item.inventory ??
            0,
        ) > 0
          ? "In stock"
          : "Out of stock",

      raw: item,
    }));
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastLoaded, setLastLoaded] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Read-only milestone: do not add/edit/delete records until database rules are secured.
      const data = await databaseRequest("products", "GET", user?.idToken);
      setProducts(normalizeRecords(data));
      setLastLoaded(new Date());
    } catch (err) {
      setError(err.message || "Could not load products from Firebase.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(
    () => [
      "All categories",
      ...new Set(products.map((item) => item.category).filter(Boolean)),
    ],
    [products],
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((item) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query);
        const matchesCategory =
          category === "All categories" || item.category === category;
        return matchesSearch && matchesCategory;
      }),
    [products, search, category],
  );
  const inStock = products.filter((item) => item.quantity > 0).length;

  return (
    <AdminLayout title="Products">
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.8px] text-[#8a806f]">
              Catalog
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Your products
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[#77776e]">
              Products currently stored in your Chinmay Store Firebase catalog.
            </p>
          </div>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#d9ddd5] bg-white px-4 py-2.5 text-sm font-semibold text-[#263e32] shadow-sm transition hover:bg-[#f8faf7] disabled:opacity-60 sm:self-auto"
          >
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <RefreshCw size={17} />
            )}{" "}
            Refresh catalog
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Total products"
            value={loading ? "—" : products.length}
            icon={<Package size={20} />}
          />
          <Stat
            label="In stock"
            value={loading ? "—" : inStock}
            icon={<CheckCircle2 size={20} />}
          />
          <Stat
            label="Out of stock"
            value={loading ? "—" : products.length - inStock}
            icon={<Box size={20} />}
          />
        </div>

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
                placeholder="Search by product name or ID"
                className="min-h-12 w-full rounded-xl border border-[#dedfd8] bg-[#fcfcfa] pl-11 pr-4 text-base outline-none transition placeholder:text-[#99998f] focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15"
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-12 rounded-xl border border-[#dedfd8] bg-white px-3.5 text-base outline-none focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15 md:min-w-52"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Couldn't load the catalog</p>
                <p>{error}</p>
                <p className="mt-1 text-red-700">
                  Check your Firebase database URL and Realtime Database read
                  rules. We have not changed any data.
                </p>
                <button
                  onClick={loadProducts}
                  className="mt-2 font-bold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {!error && loading && (
            <div className="flex min-h-52 items-center justify-center gap-3 text-base text-[#77776e]">
              <LoaderCircle size={21} className="animate-spin" /> Loading
              products from Firebase…
            </div>
          )}

          {!error && !loading && products.length === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef1eb] text-[#526d58]">
                <Package size={26} />
              </span>
              <h3 className="mt-4 text-xl font-semibold">No products found</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#77776e]">
                The Firebase{" "}
                <code className="rounded bg-[#f2f2ed] px-1.5 py-0.5">
                  products
                </code>{" "}
                path returned no product records. Confirm that the admin app is
                connected to the same project as your storefront.
              </p>
            </div>
          )}

          {!error &&
            !loading &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <div className="py-16 text-center text-base text-[#77776e]">
                No products match those filters. Try another search.
              </div>
            )}

          {!error && !loading && filteredProducts.length > 0 && (
            <>
              <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[#77776e]">
                <span>
                  Showing{" "}
                  <strong className="text-[#292820]">
                    {filteredProducts.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-[#292820]">{products.length}</strong>{" "}
                  products
                </span>
                <span className="hidden sm:inline">Read-only preview</span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#e9e8e2]">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead className="bg-[#f7f7f3] text-xs font-bold uppercase tracking-wider text-[#77776e]">
                    <tr>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">Category</th>
                      <th className="px-4 py-4">Price</th>
                      <th className="px-4 py-4">Quantity</th>
                      <th className="px-4 py-4">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeede7]">
                    {filteredProducts.map((item) => (
                      <tr
                        key={item.id}
                        className="bg-white transition hover:bg-[#fcfcfa]"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f3f3ee] text-[#9a9b91]">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <ImageOff size={20} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-xs truncate text-sm font-semibold text-[#292820]">
                                {item.name}
                              </p>
                              <p className="mt-1 max-w-xs truncate text-xs text-[#8a8b81]">
                                ID: {item.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#66675e]">
                          {item.category}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold tabular-nums text-[#292820]">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-4 py-3.5 text-sm tabular-nums text-[#292820]">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.quantity > 0 ? "bg-[#e8f2e8] text-[#315b3a]" : "bg-[#f9e9e6] text-[#9b4035]"}`}
                          >
                            {item.quantity > 0 ? "In stock" : "Out of stock"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lastLoaded && (
                <p className="mt-3 text-xs text-[#8a8b81]">
                  Last refreshed at{" "}
                  {lastLoaded.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . This page does not modify Firebase data.
                </p>
              )}
            </>
          )}
        </div>
        <div className="rounded-xl border border-[#e4dcc9] bg-[#f4f0e6] px-4 py-3.5 text-sm leading-6 text-[#665e4d]">
          <strong>Next milestone:</strong> Once we confirm this list matches
          your storefront, we'll add create, edit, delete, and stock updates
          after securing the database write rules.
        </div>
      </section>
    </AdminLayout>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#77776e]">{label}</p>
        <span className="text-[#526d58]">{icon}</span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[#292820]">
        {value}
      </p>
    </div>
  );
}
