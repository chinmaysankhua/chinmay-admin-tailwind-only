import { ArrowUpRight, Package, ShoppingBag, TrendingUp, WalletCards } from "lucide-react";
import AdminLayout from "../components/AdminLayout";

const metrics = [
  { label: "Total products", value: "—", note: "Catalog connection comes next", icon: Package },
  { label: "Orders received", value: "—", note: "Order management comes next", icon: ShoppingBag },
  { label: "Revenue", value: "—", note: "Based on verified order data", icon: WalletCards },
  { label: "Store activity", value: "Ready", note: "Admin access verified", icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <AdminLayout title="Overview">
      <section className="flex items-center justify-between gap-5 rounded-[15px] border border-[#dce4d9] bg-[#e8ede6] p-5 sm:p-8">
        <div>
          <span className="text-[10px] font-bold tracking-[1.7px] text-[#8a806f]">YOUR STORE, AT A GLANCE</span>
          <h2 className="mt-2.5 font-display text-[23px] font-semibold sm:text-[27px]">Good to have you here.</h2>
          <p className="mt-2 max-w-[510px] text-xs leading-[1.8] text-[#667066]">Your admin workspace is ready. Next, connect the product catalog and order operations.</p>
        </div>
        <div className="hidden h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-full border border-[#bdcbbb] text-[#526a56] sm:flex">
          <span className="font-display text-[29px]">CS</span><small className="text-[7px] tracking-[1px]">CHINMAY STORE</small>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-[#e9e8e2] bg-white p-3.5 sm:p-5">
            <div className="flex items-center justify-between gap-2 text-[10px] text-[#73786f] sm:text-[11px]">
              <span>{label}</span><Icon size={19} className="shrink-0 text-[#627762]" />
            </div>
            <strong className="mt-4 block font-display text-[25px] font-semibold sm:mt-[17px] sm:text-[29px]">{value}</strong>
            <p className="mt-1.5 text-[9px] leading-relaxed text-[#92948b] sm:text-[10px]">{note}</p>
          </article>
        ))}
      </section>

      <section className="mt-[18px] grid gap-[15px] lg:grid-cols-2">
        <article className="rounded-xl border border-[#e9e8e2] bg-white p-[18px] sm:p-5">
          <div className="flex items-center justify-between text-[#526a56]">
            <div><span className="text-[10px] font-bold tracking-[1.7px] text-[#8a806f]">NEXT MILESTONE</span><h3 className="mt-2 font-display text-[19px] font-semibold text-[#292820]">Bring your catalog to life</h3></div>
            <Package size={21} />
          </div>
          <p className="my-[17px] min-h-[42px] text-[11px] leading-[1.8] text-[#73786f]">Create and maintain furniture listings, manage stock, and keep storefront data consistent with Firebase.</p>
          <div className="h-[5px] overflow-hidden rounded-lg bg-[#edf0eb]"><span className="block h-full w-full rounded-lg bg-[#607b61]" /></div>
          <div className="mt-2.5 flex justify-between text-[10px] text-[#7c8178]"><span>Foundation</span><strong className="text-[#526a56]">Complete</strong></div>
        </article>

        <article className="rounded-xl border border-[#e9e8e2] bg-white p-[18px] sm:p-5">
          <div className="flex items-center justify-between text-[#526a56]">
            <div><span className="text-[10px] font-bold tracking-[1.7px] text-[#8a806f]">ORDER OPERATIONS</span><h3 className="mt-2 font-display text-[19px] font-semibold text-[#292820]">From order to delivery</h3></div>
            <ShoppingBag size={21} />
          </div>
          <p className="my-[17px] min-h-[42px] text-[11px] leading-[1.8] text-[#73786f]">Review customer orders and move them through Pending, Shipped, Delivered, or Canceled states.</p>
          <div className="flex flex-wrap gap-2">
            {[["Pending","#c7a65d"],["Shipped","#6a91b6"],["Delivered","#668d68"],["Canceled","#c57970"]].map(([label,color]) => <span key={label} className="flex items-center gap-1.5 rounded-full bg-[#f6f6f2] px-2.5 py-2 text-[10px] text-[#64695f]"><i className="h-1.5 w-1.5 rounded-full" style={{backgroundColor:color}} />{label}</span>)}
          </div>
        </article>
      </section>
      <footer className="mt-6 flex items-center justify-between px-0.5 py-4 text-[9px] tracking-[1.1px] text-[#96988f]"><span>CHINMAY STORE ADMIN</span><span className="flex items-center gap-1 tracking-normal">Secure workspace <ArrowUpRight size={13}/></span></footer>
    </AdminLayout>
  );
}
