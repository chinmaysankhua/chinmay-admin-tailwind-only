import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

const links = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
];

export default function AdminLayout({ children, title = "Overview" }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f4f0] md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-row items-center justify-between gap-3 bg-[#263e32] px-4 py-3 text-white md:min-h-screen md:flex-col md:items-stretch md:justify-start md:px-[17px] md:py-[27px]">
        <div className="flex items-center gap-2.5 text-[13px] font-bold tracking-[1.5px]">
          <span className="grid h-[35px] w-[35px] place-items-center rounded-[11px] bg-[#d8c9a7] font-display text-[23px] text-[#263e32]">C</span>
          <span>CHINMAY <span className="font-normal text-[#aebdb1]">ADMIN</span></span>
        </div>

        <div className="hidden md:block md:mt-[51px]">
          <p className="mb-[13px] ml-3 text-[10px] font-bold tracking-[1.7px] text-[#a7b4a9]">WORKSPACE</p>
          <nav className="grid gap-1.5">
            {links.map(({ to, label, icon: Icon, disabled }) =>
              disabled ? (
                <div key={to} title="Coming in a later milestone" className="flex min-h-[45px] cursor-default items-center gap-3 rounded-[9px] px-3 text-[16px] font-medium text-[#c7d0c8]/60">
                  <Icon size={18} /><span>{label}</span><span className="ml-auto text-[10px] text-[#d8c9a7]">Soon</span>
                </div>
              ) : (
                <NavLink key={to} to={to} end className={({ isActive }) => `flex min-h-[45px] items-center gap-3 rounded-[9px] px-3 text-[16px] font-medium no-underline transition ${isActive ? "bg-[#405647] text-white" : "text-[#c7d0c8] hover:bg-white/10 hover:text-white"}`}>
                  <Icon size={18} /><span>{label}</span>
                </NavLink>
              )
            )}
          </nav>
        </div>

        <div className="flex items-center md:mt-auto md:block">
          <div className="hidden items-start gap-2.5 border-t border-[#435849] px-2 py-4 text-[#d8c9a7] md:flex">
            <ShieldCheck size={18} className="shrink-0" />
            <div className="grid gap-1">
              <strong className="text-[11px] text-[#edf0eb]">Protected workspace</strong>
              <small className="text-[10px] leading-relaxed text-[#b5c0b6]">Admin access verified by server</small>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2.5 border-0 bg-transparent px-2 py-2 text-xs text-[#d5ddd6] hover:text-white md:w-full md:py-3">
            <LogOut size={17} /><span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex min-h-[83px] items-center justify-between gap-5 border-b border-[#e9e8e2] bg-white px-[18px] py-5 sm:px-6 md:min-h-[105px] md:px-9">
          <div>
            <p className="text-[10px] font-bold tracking-[1.7px] text-[#8a806f]">CHINMAY STORE / ADMIN</p>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-[29px]">{title}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-[37px] w-[37px] place-items-center rounded-full bg-[#e9eee8] font-bold text-[#263e32]">{(user?.email || "A")[0].toUpperCase()}</span>
            <span className="hidden sm:grid sm:gap-1">
              <strong className="text-[11px]">Administrator</strong>
              <small className="text-[10px] text-[#85877e]">{user?.email}</small>
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-3.5 sm:p-6 md:px-9 md:py-[29px]">{children}</div>
      </main>
    </div>
  );
}
