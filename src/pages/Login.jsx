import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext";

export default function Login() {
  const { user, loading: checkingSession, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!checkingSession && user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white md:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#263e32] px-[9%] py-10 text-white md:flex">
        <div className="absolute -bottom-20 -right-56 h-[460px] w-[460px] rounded-full border border-white/[0.09] shadow-[0_0_0_50px_rgba(255,255,255,0.03),0_0_0_100px_rgba(255,255,255,0.02)]" />
        <div className="relative z-10 flex items-center gap-2.5 text-[13px] font-bold tracking-[1.5px]">
          <span className="grid h-[35px] w-[35px] place-items-center rounded-[11px] bg-[#d8c9a7] font-display text-[23px] text-[#263e32]">
            C
          </span>
          <span>
            CHINMAY <span className="font-normal text-[#aebdb1]">ADMIN</span>
          </span>
        </div>
        <div className="relative z-10 max-w-[480px]">
          <span className="text-[10px] font-bold tracking-[1.7px] text-[#d8c9a7]">
            THE CONTROL ROOM
          </span>
          <h1 className="my-[22px] font-display text-5xl font-semibold leading-[1.08] tracking-[-1.5px] lg:text-[68px]">
            Every detail.
            <br />
            <em className="text-[#d8c9a7]">Under control.</em>
          </h1>
          <p className="max-w-[360px] text-sm leading-[1.9] text-[#c7d0c8]">
            Manage your catalog, orders, and customer experience from one
            considered workspace.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2.5 text-[11px] text-[#c7d0c8]">
          <ShieldCheck size={18} /> Private access for authorized administrators
        </div>
      </section>

      <section className="grid min-h-screen place-items-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[390px]">
          <div className="mb-12 flex items-center gap-2.5 text-[13px] font-bold tracking-[1.5px] md:hidden">
            <span className="grid h-[35px] w-[35px] place-items-center rounded-[11px] bg-[#d8c9a7] font-display text-[23px] text-[#263e32]">
              C
            </span>
            <span>
              CHINMAY <span className="font-normal text-[#667b67]">ADMIN</span>
            </span>
          </div>
          <div className="text-[10px] font-bold tracking-[1.7px] text-[#667b67]">
            ADMINISTRATOR ACCESS
          </div>
          <h2 className="mt-[13px] font-display text-[32px] font-semibold sm:text-4xl">
            Welcome back
          </h2>
          <p className="mb-8 mt-2 text-xs leading-[1.8] text-[#7b7f76]">
            Sign in with your authorized administrator account.
          </p>
          <form onSubmit={handleSubmit} className="grid">
            <label htmlFor="email" className="mb-2 text-[11px] font-bold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourstore.com"
              required
              className="mb-[21px] h-[46px] w-full rounded-lg border border-[#dedfd8] bg-white px-[13px] text-xs outline-none transition focus:border-[#607b61] focus:ring-4 focus:ring-[#607b61]/10"
            />
            <label htmlFor="password" className="mb-2 text-[11px] font-bold">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="mb-[21px] h-[46px] w-full rounded-lg border border-[#dedfd8] bg-white px-[13px] text-xs outline-none transition focus:border-[#607b61] focus:ring-4 focus:ring-[#607b61]/10"
            />
            {error && (
              <div
                role="alert"
                className="mb-[15px] -mt-1.5 rounded-[7px] border border-[#f3d0ca] bg-[#fff0ee] p-2.5 text-[11px] leading-relaxed text-[#a53e31]"
              >
                {error}
              </div>
            )}
            <button
              className="mt-1 flex h-[47px] items-center justify-center gap-2.5 rounded-lg border-0 bg-[#263e32] text-xs font-bold text-white transition hover:bg-[#1d3027] disabled:opacity-60"
              disabled={submitting || checkingSession}
            >
              {submitting ? (
                "Verifying access…"
              ) : (
                <>
                  Sign in securely <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="mt-[25px] flex items-start gap-2 text-[10px] leading-[1.7] text-[#83877d]">
            <ShieldCheck size={16} className="shrink-0 text-[#607b61]" />
            <span>
              Admin permissions are verified server-side. Customer accounts
              cannot access this dashboard.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
