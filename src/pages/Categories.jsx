import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle2, Edit3, Folder, FolderPlus, ImageOff,
  LoaderCircle, RefreshCw, Search, Trash2, X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import { databaseRequest } from "../firebase/rest";
import { useAuth } from "../state/AuthContext";

const inputClass = "mt-1.5 min-h-11 w-full rounded-xl border border-[#dedfd8] bg-white px-3.5 py-2.5 text-sm text-[#292820] outline-none transition placeholder:text-[#99998f] focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15";
const labelClass = "block text-sm font-semibold text-[#4b4b41]";
const emptyForm = { name: "", imageUrl: "", sortOrder: "1", isActive: true };

function slugify(value) {
  return value.normalize("NFKD").toLowerCase().trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function parseCategories(value) {
  if (!value) return [];
  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item]) : Object.entries(value);
  return entries.filter(([, item]) => item && typeof item === "object").map(([id, item]) => ({
    id,
    name: item.name || id,
    slug: item.slug || id,
    imageUrl: item.imageUrl || "",
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder ?? 999),
  })).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
function parseProducts(value) {
  if (!value) return [];
  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item]) : Object.entries(value);
  return entries.filter(([, item]) => item && typeof item === "object").map(([key, item]) => ({
    key,
    categoryId: item.categoryId || "",
  }));
}

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [categoryData, productData] = await Promise.all([
        databaseRequest("categories", "GET", user?.idToken),
        databaseRequest("products", "GET", user?.idToken),
      ]);
      setCategories(parseCategories(categoryData));
      setProducts(parseProducts(productData));
    } catch (err) {
      setError(err.message || "Could not load categories.");
    } finally { setLoading(false); }
  }, [user?.idToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((category) => !q || category.name.toLowerCase().includes(q) || category.id.toLowerCase().includes(q));
  }, [categories, search]);

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: String(categories.length + 1) });
    setFormError(""); setSuccess(""); setShowForm(true);
  }
  function openEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, imageUrl: category.imageUrl, sortOrder: String(category.sortOrder), isActive: category.isActive });
    setFormError(""); setSuccess(""); setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault(); setFormError(""); setSuccess("");
    if (!user?.idToken) { setFormError("Your admin session is missing. Sign in again."); return; }
    const name = form.name.trim();
    const slug = slugify(name);
    if (!name || !slug) { setFormError("Enter a category name containing letters or numbers."); return; }
    const sortOrder = Number(form.sortOrder);
    if (form.sortOrder.trim() === "" || !Number.isInteger(sortOrder) || sortOrder < 0) {
      setFormError("Display order must be a whole number of 0 or more."); return;
    }
    let imageUrl = form.imageUrl.trim();
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch { setFormError("Image URL must begin with http:// or https://."); return; }
    }

    // Category keys are stable because products reference them via categoryId.
    // Editing a category's name never changes its Firebase key.
    let id = editingId;
    if (!editingId) {
      const base = slug;
      id = base;
      let suffix = 2;
      while (categories.some((item) => item.id === id)) {
        id = `${base}-${suffix++}`;
      }
    }
    const payload = {
      name,
      slug: editingId || slug,
      imageUrl,
      isActive: Boolean(form.isActive),
      sortOrder,
    };

    setSaving(true);
    try {
      await databaseRequest(`categories/${id}`, editingId ? "PATCH" : "PUT", user.idToken, payload);
      await loadData();
      setShowForm(false); setEditingId(null); setForm(emptyForm);
      setSuccess(editingId ? "Category updated successfully." : "Category created successfully.");
    } catch (err) {
      setFormError(err.message || "Could not save category. Check admin permissions and Firebase rules.");
    } finally { setSaving(false); }
  }

  async function toggleActive(category) {
    const inUse = products.some((product) => product.categoryId === category.id);
    if (category.isActive && inUse && !window.confirm(`"${category.name}" is used by existing products. Deactivate it anyway? Existing products will keep their category reference, but it will no longer be available for new products.`)) return;
    setError(""); setSuccess("");
    try {
      await databaseRequest(`categories/${category.id}`, "PATCH", user?.idToken, { isActive: !category.isActive });
      setCategories((current) => current.map((item) => item.id === category.id ? { ...item, isActive: !item.isActive } : item));
      setSuccess(`Category ${category.isActive ? "deactivated" : "activated"}.`);
    } catch (err) { setError(err.message || "Could not update category status."); }
  }

  async function deleteCategory(category) {
    const linkedProducts = products.filter((product) => product.categoryId === category.id);
    if (linkedProducts.length) {
      setError(`Cannot delete "${category.name}" because ${linkedProducts.length} product(s) use it. Reassign those products first, or deactivate this category.`);
      return;
    }
    if (!window.confirm(`Delete category "${category.name}" permanently? This cannot be undone.`)) return;
    setError(""); setSuccess("");
    try {
      await databaseRequest(`categories/${category.id}`, "DELETE", user?.idToken);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setSuccess(`"${category.name}" was deleted.`);
    } catch (err) { setError(err.message || "Could not delete category."); }
  }

  return (
    <AdminLayout title="Categories">
      <section className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.8px] text-[#8a806f]">Catalog structure</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Categories</h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-[#77776e]">Create and manage as many product categories as your store needs.</p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <button onClick={loadData} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d9ddd5] bg-white px-4 text-sm font-semibold text-[#263e32] hover:bg-[#f8faf7] disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <RefreshCw size={17} />} Refresh</button>
            <button onClick={openAdd} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#263e32] px-4 text-sm font-semibold text-white hover:bg-[#1d3026]"><FolderPlus size={17} /> Add category</button>
          </div>
        </div>

        {success && <Notice type="success" message={success} onClose={() => setSuccess("")} />}
        {error && <Notice type="error" message={error} onClose={() => setError("")} />}

        {showForm && (
          <div className="overflow-hidden rounded-2xl border border-[#e7e6df] bg-white shadow-sm">
            <div className="flex items-start justify-between border-b border-[#eeede7] px-5 py-4 sm:px-6">
              <div><p className="text-xs font-bold uppercase tracking-[1.6px] text-[#8a806f]">Catalog structure</p><h3 className="mt-1 text-xl font-semibold">{editingId ? "Edit category" : "Create category"}</h3><p className="mt-1 text-sm text-[#77776e]">The category ID stays stable when you edit its name.</p></div>
              <button type="button" onClick={() => !saving && setShowForm(false)} disabled={saving} aria-label="Close form" className="rounded-lg p-2 text-[#77776e] hover:bg-[#f3f3ee]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{formError}</div>}
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>Category name *<input name="name" value={form.name} onChange={updateForm} maxLength={100} placeholder="e.g. Study Tables" className={inputClass} required /></label>
                <label className={labelClass}>Display order *<input name="sortOrder" type="number" min="0" step="1" value={form.sortOrder} onChange={updateForm} className={inputClass} required /><span className="mt-1 block text-xs font-normal text-[#77776e]">Lower numbers appear first where sorting is supported.</span></label>
                <label className={`${labelClass} md:col-span-2`}>Category image URL <input name="imageUrl" type="url" value={form.imageUrl} onChange={updateForm} placeholder="https://images.unsplash.com/..." className={inputClass} /><span className="mt-1 block text-xs font-normal text-[#77776e]">Optional. Use a publicly accessible image URL.</span></label>
              </div>
              {form.imageUrl.trim() && <div className="flex items-center gap-3 rounded-xl bg-[#f7f7f3] p-3"><img src={form.imageUrl} alt="Category preview" className="h-16 w-20 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /><span className="min-w-0 truncate text-sm text-[#77776e]">Image preview: {form.imageUrl}</span></div>}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7e6df] bg-[#fcfcfa] p-4"><input name="isActive" type="checkbox" checked={form.isActive} onChange={updateForm} className="mt-1 h-4 w-4 accent-[#263e32]" /><span><span className="block text-sm font-semibold">Category is active</span><span className="mt-1 block text-sm text-[#77776e]">Active categories are available in the product form.</span></span></label>
              <div className="flex flex-col-reverse gap-2 border-t border-[#eeede7] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="min-h-11 rounded-xl border border-[#d9ddd5] px-5 text-sm font-semibold text-[#263e32] hover:bg-[#f8faf7]">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#263e32] px-5 text-sm font-semibold text-white hover:bg-[#1d3026] disabled:opacity-60">{saving && <LoaderCircle size={17} className="animate-spin" />}{saving ? "Saving…" : editingId ? "Save changes" : "Create category"}</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total categories" value={loading ? "—" : categories.length} />
          <Stat label="Active categories" value={loading ? "—" : categories.filter((c) => c.isActive).length} />
          <Stat label="Products assigned" value={loading ? "—" : new Set(products.map((p) => p.categoryId).filter(Boolean)).size} />
        </div>

        <div className="rounded-2xl border border-[#e7e6df] bg-white p-4 shadow-sm sm:p-5">
          <label className="relative block"><Search size={19} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#85877e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories by name or ID" className="min-h-12 w-full rounded-xl border border-[#dedfd8] bg-[#fcfcfa] pl-11 pr-4 text-base outline-none focus:border-[#526d58] focus:ring-2 focus:ring-[#526d58]/15" /></label>
          {loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-[#77776e]"><LoaderCircle size={21} className="animate-spin" />Loading categories…</div> : categories.length === 0 ? <div className="py-16 text-center text-[#77776e]"><Folder size={28} className="mx-auto mb-3" /><p className="font-semibold">No categories found</p><p className="mt-1 text-sm">Add your first category to make it available for products.</p></div> : filtered.length === 0 ? <div className="py-16 text-center text-[#77776e]">No categories match your search.</div> : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((category) => {
              const linkedCount = products.filter((product) => product.categoryId === category.id).length;
              return <article key={category.id} className="overflow-hidden rounded-xl border border-[#e9e8e2] bg-white">
                <div className="relative h-36 bg-[#f3f3ee]">{category.imageUrl ? <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div className="grid h-full place-items-center text-[#9a9b91]"><ImageOff size={28} /></div>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${category.isActive ? "bg-[#e8f2e8] text-[#315b3a]" : "bg-[#f9e9e6] text-[#9b4035]"}`}>{category.isActive ? "Active" : "Inactive"}</span></div>
                <div className="p-4"><h3 className="truncate text-base font-semibold text-[#292820]">{category.name}</h3><p className="mt-1 truncate text-xs text-[#8a8b81]">ID: {category.id}</p><div className="mt-3 flex items-center justify-between text-xs text-[#77776e]"><span>{linkedCount} linked product{linkedCount === 1 ? "" : "s"}</span><span>Order {category.sortOrder}</span></div><div className="mt-4 flex flex-wrap gap-2 border-t border-[#eeede7] pt-3"><button onClick={() => openEdit(category)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dedfd8] px-3 py-2 text-xs font-semibold text-[#405647] hover:bg-[#eef1eb]"><Edit3 size={14} /> Edit</button><button onClick={() => toggleActive(category)} className="rounded-lg border border-[#dedfd8] px-3 py-2 text-xs font-semibold text-[#405647] hover:bg-[#eef1eb]">{category.isActive ? "Deactivate" : "Activate"}</button><button onClick={() => deleteCategory(category)} disabled={linkedCount > 0} title={linkedCount > 0 ? "Reassign linked products before deleting" : "Delete category"} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14} /> Delete</button></div></div>
              </article>;
            })}</div>
          )}
        </div>
        <p className="text-xs leading-5 text-[#85877e]">Category IDs are stored as Firebase keys and referenced by products through <code>categoryId</code>. A category used by products cannot be deleted until those products are reassigned.</p>
      </section>
    </AdminLayout>
  );
}
function Notice({ type, message, onClose }) {
  const success = type === "success";
  return <div role={success ? "status" : "alert"} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}><span className="flex-1">{message}</span><button onClick={onClose} aria-label="Dismiss message"><X size={17} /></button></div>;
}
function Stat({ label, value }) {
  return <div className="rounded-2xl border border-[#e7e6df] bg-white p-5 shadow-sm"><p className="text-sm font-medium text-[#77776e]">{label}</p><p className="mt-4 font-display text-3xl font-semibold tabular-nums text-[#292820]">{value}</p></div>;
}
