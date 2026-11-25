import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { HOME } from "../auth/RequireRole";

const inputClass =
  "mb-4 mt-1 h-11 w-full rounded-lg border border-gray-300 bg-[#fafafa] px-3 text-sm shadow-[0_2px_0_rgba(0,0,0,0.12)] outline-none placeholder:text-gray-400 focus:border-brand";
const buttonClass =
  "w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
const codeClass = `${inputClass} text-center text-xl tracking-[0.5em]`;

// Two panels like the Figma login: blurred school gate with a red wash on the
// left, cream page with a white card on the right.
function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-cream">
      <div className="relative hidden w-[42%] overflow-hidden md:flex md:flex-col md:justify-center">
        <img src="/school-gate.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[6px]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(225,35,35,.82) 0%, rgba(205,28,28,.78) 45%, rgba(105,40,40,.92) 100%)",
          }}
        />
        <div className="relative p-14 text-white lg:p-16">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            San Mateo
            <br />
            Elementary
            <br />
            School
          </h1>
          <span className="mt-4 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            Built for Inclusive Learning
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-5 flex items-center gap-3">
            <img src="/school-logo.png" alt="San Mateo Elementary School seal" className="h-11 w-11 object-contain" />
            <p className="text-base font-semibold">EduQuest AI</p>
          </div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {subtitle && <p className={`mb-4 text-xs text-gray-600 ${title ? "mt-1" : ""}`}>{subtitle}</p>}
          {children}
          {footer}
        </div>
        <p className="absolute bottom-8 text-center text-[11px] text-gray-400">
          © 2025 San Mateo Elementary School. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [step, setStep] = useState("credentials"); // credentials | otp | setup | recovery
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [qr, setQr] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""); // "" | "forgot" | "activate"

  const run = async (action) => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (token) => {
    const user = await signIn(token);
    navigate(HOME[user.role.name], { replace: true });
  };

  const submitCredentials = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post("/login", { email, password });
      setCode("");

      if (data.needs_otp) {
        setTicket(data.ticket);
        setStep("otp");
      } else if (data.needs_setup) {
        setSetupToken(data.token);
        const res = await api.post("/2fa/setup", null, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        setQr(res.data);
        setStep("setup");
      }
    });
  };

  const submitOtp = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post("/login/verify-otp", { ticket, code });
      await finish(data.token);
    });
  };

  const confirmSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const { data } = await api.post(
        "/2fa/confirm",
        { code },
        { headers: { Authorization: `Bearer ${setupToken}` } }
      );
      setConfirmed(data);
      setStep("recovery");
    });
  };

  const backToSignIn = () => {
    setStep("credentials");
    setError("");
    setCode("");
  };

  if (step === "otp") {
    return (
      <Shell title="Two-factor Verification" subtitle="Enter the 6-digit code from your Authenticator app.">
        <form onSubmit={submitOtp}>
          <input
            className={codeClass}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            aria-label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p role="alert" className="mb-3 text-xs text-brand">{error}</p>}
          <button className={buttonClass} disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify"}
          </button>
        </form>
        <button className="mt-4 text-xs text-gray-500 underline" onClick={backToSignIn}>
          Back to Sign In
        </button>
      </Shell>
    );
  }

  if (step === "setup") {
    return (
      <Shell
        title="Activate your account"
        subtitle="Scan this QR code with Google Authenticator (or any authenticator app), then enter the 6-digit code."
      >
        <img
          alt="Authenticator QR code"
          className="mx-auto mb-2 h-44 w-44"
          src={`data:image/svg+xml;utf8,${encodeURIComponent(qr.qr_svg)}`}
        />
        <p className="mb-3 break-all text-center text-xs text-gray-500">
          Can’t scan? Enter this key: <span className="font-mono">{qr.secret}</span>
        </p>
        <form onSubmit={confirmSetup}>
          <input
            className={codeClass}
            inputMode="numeric"
            maxLength={6}
            aria-label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p role="alert" className="mb-3 text-xs text-brand">{error}</p>}
          <button className={buttonClass} disabled={busy || code.length !== 6}>
            {busy ? "Activating…" : "Activate Account"}
          </button>
        </form>
        <button className="mt-4 text-xs text-gray-500 underline" onClick={backToSignIn}>
          Back to Sign In
        </button>
      </Shell>
    );
  }

  if (step === "recovery") {
    return (
      <Shell
        title="Save your recovery codes"
        subtitle="Keep these somewhere safe. You’ll need one if you lose your phone."
      >
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 font-mono text-xs">
          {confirmed.recovery_codes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {error && <p role="alert" className="mb-3 text-xs text-brand">{error}</p>}
        <button className={buttonClass} disabled={busy} onClick={() => run(() => finish(confirmed.token))}>
          I’ve saved them, continue
        </button>
      </Shell>
    );
  }

  return (
    <Shell
      subtitle="Welcome back! Please enter your details."
      footer={
        <>
          <div className="mt-5 flex items-center justify-between text-[11px] text-gray-600">
            <button type="button" className="hover:text-ink" onClick={() => setNotice(notice === "forgot" ? "" : "forgot")}>
              Forgot password?
            </button>
            <button
              type="button"
              className="underline hover:text-ink"
              onClick={() => setNotice(notice === "activate" ? "" : "activate")}
            >
              Activate invited school account
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              {notice === "forgot"
                ? "Password reset isn’t available yet. Please ask your teacher or the school administrator for help."
                : "Sign in with the email and temporary password you were given. You’ll be guided through setting up your account."}
            </p>
          )}
        </>
      }
    >
      <form onSubmit={submitCredentials}>
        <label className="text-xs font-semibold" htmlFor="email">
          School Email
        </label>
        <input
          id="email"
          type="email"
          className={inputClass}
          placeholder="name@school.gmail.com"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="text-xs font-semibold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={inputClass}
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p role="alert" className="mb-3 text-xs text-brand">{error}</p>}
        <button className={buttonClass} disabled={busy}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </Shell>
  );
}
