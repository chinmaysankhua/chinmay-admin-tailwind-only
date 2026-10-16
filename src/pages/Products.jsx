import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Box, CheckCircle2, Edit3, ImageOff, LoaderCircle,
  Package, Plus, RefreshCw, Search, Trash2, X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { databaseRequest } from "../firebase/rest";
import { useAuth } from "../state/AuthContext";

const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3.5 py-2.5 text-sm text-[#292820] outline-none transition placeholder:text-[#99998f] focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15";
const labelClass = "block text-sm font-semibold text-[#4b4b41]";
const emptyForm = { name: "", description: "", categoryId: "", price: "", stockQuantity: "0", image: "", isActive: true };

function records(value) {
  if (!value) return [];
  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item]) : Object.entries(value);
  return entries.filter(([, item]) => item && typeof item === "object").map(([key, item]) => ({
    key,
    id: item.id || key,
    name: item.name || item.title || item.productName || "Untitled product",
    categoryId: item.categoryId || "",
    category: item.categoryName || item.category || item.categoryId || "Uncategorized",
    price: Number(item.price ?? item.salePrice ?? item.sellingPrice ?? 0),
    quantity: Number(item.stockQuantity ?? item.quantity ?? item.stock ?? item.inventory ?? 0),
    image: item.image || item.imageUrl || item.thumbnail || item.thumbnailUrl || item.images?.[0] || "",
    description: item.description || "",
    slug: item.slug || "",
    isActive: item.isActive !== false,
    raw: item,
  }));
}

function categoriesFrom(value) {
  if (!value) return [];
  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item]) : Object.entries(value);
  return entries.filter(([, item]) => item && typeof item === "object").map(([key, item]) => ({
    id: key,
    name: item.name || key,
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder ?? 999),
  })).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price || 0);
}
function slugify(value) {
  return value.normalize("NFKD").toLowerCase().trim().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categoryRecords, setCategoryRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [productData, categoryData] = await Promise.all([
        databaseRequest("products", "GET", user?.idToken),
        databaseRequest("categories", "GET", user?.idToken),
      ]);
      setProducts(records(productData));
      setCategoryRecords(categoriesFrom(categoryData));
    } catch (err) {
      setError(err.message || "Could not load products and categories.");
    } finally { setLoading(false); }
  }, [user?.idToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredProducts = useMemo(() => products.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [products, search, categoryFilter]);

  const inStock = products.filter((p) => p.quantity > 0).length;

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  function openAdd() {
    setEditingKey(null); setForm(emptyForm); setFormError(""); setSuccess(""); setShowForm(true);
  }
  function openEdit(item) {
    setEditingKey(item.key);
    setForm({
      name: item.name === "Untitled product" ? "" : item.name,
      description: item.description,
      categoryId: item.categoryId,
      price: String(item.price),
      stockQuantity: String(item.quantity),
      image: item.image,
      isActive: item.isActive,
    });
    setFormError(""); setSuccess(""); setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault(); setFormError(""); setSuccess("");
    if (!user?.idToken) { setFormError("Your admin session is missing. Sign out and sign in again."); return; }
    if (!form.name.trim()) { setFormError("Enter a product name."); return; }
    if (!form.categoryId || !categoryRecords.some((c) => c.id === form.categoryId && c.isActive)) { setFormError("Choose an active category."); return; }
    const price = Number(form.price), stockQuantity = Number(form.stockQuantity);
    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) { setFormError("Enter a valid non-negative price."); return; }
    if (form.stockQuantity.trim() === "" || !Number.isInteger(stockQuantity) || stockQuantity < 0) { setFormError("Stock must be a whole number of 0 or more."); return; }
    let imageUrl;
    try { imageUrl = new URL(form.image.trim()); if (!["http:", "https:"].includes(imageUrl.protocol)) throw new Error(); }
    catch { setFormError("Enter a valid image URL starting with http:// or https://."); return; }
    const slug = slugify(form.name);
    if (!slug) { setFormError("Product name must contain letters or numbers."); return; }
    const productId = editingKey || `${slug}-${Date.now().toString(36)}`;
    const payload = {
      id: productId,
      categoryId: form.categoryId,
      description: form.description.trim(),
      image: form.image.trim(),
      isActive: Boolean(form.isActive),
      name: form.name.trim(),
      price,
      slug,
      stockQuantity,
    };
    setSaving(true);
    try {
      await databaseRequest(`products/${productId}`, editingKey ? "PATCH" : "PUT", user.idToken, payload);
      await loadAll();
      setShowForm(false); setForm(emptyForm); setEditingKey(null);
      setSuccess(editingKey ? "Product updated successfully." : "Product added successfully.");
    } catch (err) {
      setFormError(err.message || "Could not save the product. Check admin permissions and Firebase rules.");
    } finally { setSaving(false); }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" permanently? This cannot be undone.`)) return;
    setError(""); setSuccess("");
    try {
      await databaseRequest(`products/${item.key}`, "DELETE", user?.idToken);
      setProducts((current) => current.filter((p) => p.key !== item.key));
      setSuccess(`"${item.name}" was deleted.`);
    } catch (err) { setError(err.message || "Could not delete product."); }
  }

  async function toggleActive(item) {
    setError(""); setSuccess("");
    try {
      await databaseRequest(`products/${item.key}`, "PATCH", user?.idToken, { isActive: !item.isActive });
      setProducts((current) => current.map((p) => p.key === item.key ? { ...p, isActive: !p.isActive } : p));
      setSuccess(`Product ${item.isActive ? "deactivated" : "activated"}.`);
    } catch (err) { setError(err.message || "Could not update product status."); }
  }

  return (
    <AdminLayout title="Products">
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.8px] text-[#8a806f]">Catalog management</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Your products</h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[#77776e]">Create, update, and manage the products in your Chinmay Store catalog.</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button onClick={loadAll} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d9ddd5] bg-white px-4 text-sm font-semibold text-[#263e32] hover:bg-[#f8faf7] disabled:opacity-60">
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />} Refresh
            </button>
            <button onClick={openAdd} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#263e32] px-4 text-sm font-semibold text-white hover:bg-[#1d3026]"><Plus size={17} /> Add product</button>
          </div>
        </div>

        {success && <Notice type="success" message={success} onClose={() => setSuccess("")} />}
        {error && <Notice type="error" message={error} onClose={() => setError("")} />}

        {showForm && (
          <div className="overflow-hidden rounded-2xl border border-[#e7e6df] bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-[#eeede7] px-5 py-4 sm:px-6">
              <div><p className="text-xs font-bold uppercase tracking-[1.6px] text-[#8a806f]">Catalog management</p><h3 className="mt-1 text-xl font-semibold">{editingKey ? "Edit product" : "Add a product"}</h3><p className="mt-1 text-sm text-[#77776e]">Fields marked * are required.</p></div>
              <button type="button" onClick={() => !saving && setShowForm(false)} disabled={saving} aria-label="Close form" className="rounded-lg p-2 text-[#77776e] hover:bg-[#f3f3ee]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{formError}</div>}
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>Product name *<input name="name" value={form.name} onChange={updateForm} maxLength={120} placeholder="e.g. Modern Wooden Bed" className={inputClass} required /></label>
                <label className={labelClass}>Category *<select name="categoryId" value={form.categoryId} onChange={updateForm} className={inputClass} required><option value="">Choose a category</option>{categoryRecords.filter((c) => c.isActive || c.id === form.categoryId).map((c) => <option key={c.id} value={c.id}>{c.name}{!c.isActive ? " (inactive)" : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-[#77776e]">Need another category? Use Category management.</span></label>
                <label className={labelClass}>Price (INR) *<input name="price" type="number" min="0" step="1" value={form.price} onChange={updateForm} placeholder="15999" className={inputClass} required /></label>
                <label className={labelClass}>Stock quantity *<input name="stockQuantity" type="number" min="0" step="1" value={form.stockQuantity} onChange={updateForm} className={inputClass} required /></label>
                <label className={`${labelClass} md:col-span-2`}>Image URL *<input name="image" type="url" value={form.image} onChange={updateForm} placeholder="https://images.unsplash.com/..." className={inputClass} required /></label>
                <label className={`${labelClass} md:col-span-2`}>Description<textarea name="description" value={form.description} onChange={updateForm} rows={3} maxLength={2000} placeholder="Describe the product..." className={`${inputClass} resize-y`} /></label>
              </div>
              {form.image.trim() && <div className="flex items-center gap-3 rounded-xl bg-[#f7f7f3] p-3"><img src={form.image} alt="Product preview" className="h-16 w-16 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /><span className="min-w-0 truncate text-sm text-[#77776e]">Image preview: {form.image}</span></div>}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7e6df] bg-[#fcfcfa] p-4"><input name="isActive" type="checkbox" checked={form.isActive} onChange={updateForm} className="mt-1 h-4 w-4 accent-[#263e32]" /><span><span className="block text-sm font-semibold">Product is active</span><span className="mt-1 block text-sm text-[#77776e]">Inactive products can be hidden from your storefront if it filters by isActive.</span></span></label>
              <div className="flex flex-col-reverse gap-2 border-t border-[#eeede7] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="min-h-11 rounded-xl border border-[#d9ddd5] px-5 text-sm font-semibold text-[#263e32] hover:bg-[#f8faf7]">Cancel</button>
                <button type="submit" disabled={saving || categoryRecords.filter((c) => c.isActive).length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#263e32] px-5 text-sm font-semibold text-white hover:bg-[#1d3026] disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{saving ? "Saving…" : editingKey ? "Save changes" : "Create product"}</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total products" value={loading ? "—" : products.length} icon={<Package size={20} />} />
          <Stat label="In stock" value={loading ? "—" : inStock} icon={<CheckCircle2 size={20} />} />
          <Stat label="Out of stock" value={loading ? "—" : products.length - inStock} icon={<Box size={20} />} />
        </div>

        <div className="rounded-2xl border border-[#e7e6df] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative block min-w-0 flex-1"><Search size={19} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#85877e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name or ID" className="min-h-12 w-full rounded-xl border border-[#dedfd8] bg-[#fcfcfa] pl-11 pr-4 text-base outline-none focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15" /></label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="min-h-12 rounded-xl border border-[#dedfd8] bg-white px-3.5 text-base outline-none focus:border-[#526d58] md:min-w-52"><option value="all">All categories</option>{categoryRecords.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          {loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-[#77776e]"><LoaderCircle size={21} className="animate-spin" />Loading catalog…</div> : products.length === 0 ? <div className="py-16 text-center text-[#77776e]"><Package size={28} className="mx-auto mb-3" /><p className="font-semibold">No products yet</p><p className="mt-1 text-sm">Use Add product to create your first catalog item.</p></div> : filteredProducts.length === 0 ? <div className="py-16 text-center text-[#77776e]">No products match your search or category filter.</div> : (
            <>
              <div className="mt-5 flex items-center justify-between text-sm text-[#77776e]"><span>Showing <strong className="text-[#292820]">{filteredProducts.length}</strong> of <strong className="text-[#292820]">{products.length}</strong> products</span><span className="hidden sm:inline">Live Firebase catalog</span></div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#e9e8e2]"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="bg-[#f7f7f3] text-xs font-bold uppercase tracking-wider text-[#77776e]"><tr><th className="px-4 py-4">Product</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Price</th><th className="px-4 py-4">Stock</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#eeede7]">{filteredProducts.map((item) => <tr key={item.key} className="bg-white hover:bg-[#fcfcfa]"><td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f3f3ee] text-[#9a9b91]">{item.image ? <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <ImageOff size={20} />}</div><div className="min-w-0"><p className="max-w-xs truncate text-sm font-semibold text-[#292820]">{item.name}</p><p className="mt-1 max-w-xs truncate text-xs text-[#8a8b81]">ID: {item.key}</p></div></div></td><td className="px-4 py-3.5 text-sm text-[#66675e]">{categoryRecords.find((c) => c.id === item.categoryId)?.name || item.category}</td><td className="px-4 py-3.5 text-sm font-semibold tabular-nums">{formatPrice(item.price)}</td><td className="px-4 py-3.5 text-sm tabular-nums">{item.quantity}</td><td className="px-4 py-3.5"><div className="flex flex-col items-start gap-1"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.quantity > 0 ? "bg-[#e8f2e8] text-[#315b3a]" : "bg-[#f9e9e6] text-[#9b4035]"}`}>{item.quantity > 0 ? "In stock" : "Out of stock"}</span><span className={`text-xs ${item.isActive ? "text-[#315b3a]" : "text-[#9b4035]"}`}>{item.isActive ? "Active" : "Inactive"}</span></div></td><td className="px-4 py-3.5"><div className="flex justify-end gap-1.5"><button onClick={() => openEdit(item)} title="Edit product" aria-label={`Edit ${item.name}`} className="rounded-lg border border-[#dedfd8] p-2 text-[#405647] hover:bg-[#eef1eb]"><Edit3 size={16} /></button><button onClick={() => toggleActive(item)} title={item.isActive ? "Deactivate product" : "Activate product"} className="rounded-lg border border-[#dedfd8] px-2.5 py-2 text-xs font-semibold text-[#405647] hover:bg-[#eef1eb]">{item.isActive ? "Deactivate" : "Activate"}</button><button onClick={() => handleDelete(item)} title="Delete product" aria-label={`Delete ${item.name}`} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
            </>
          )}
        </div>
        <p className="text-xs leading-5 text-[#85877e]">Changes are written to Firebase only when the signed-in administrator is authorized by your database rules. Deleting a product is permanent.</p>
      </section>
    </AdminLayout>
  );
}

function Notice({ type, message, onClose }) {
  const success = type === "success";
  return <div role={success ? "status" : "alert"} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}><span className="flex-1">{message}</span><button onClick={onClose} aria-label="Dismiss message"><X size={17} /></button></div>;
}
function Stat({ label, value, icon }) {
  return <div className="rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#77776e]">{label}</p><span className="text-[#526d58]">{icon}</span></div><p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[#292820]">{value}</p></div>;
}
