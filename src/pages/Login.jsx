import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { HOME } from "../auth/RequireRole";

const inputClass =
  "mb-3 mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand";
const buttonClass =
  "w-full rounded-md bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
const codeClass = `${inputClass} text-center text-xl tracking-[0.5em]`;

function Shell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden p-16 text-white md:flex">
        {/* School photo sits behind the red wash */}
        <img
          src="/school-gate.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Red wash: lower the /60 and /70 numbers to show more of the school */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/60 to-brand-dark/70" />

        <div className="relative">
          <h1 className="text-5xl font-bold leading-tight drop-shadow-md">
            San Mateo
            <br />
            Elementary
            <br />
            School
          </h1>
          <span className="mt-4 inline-block w-fit rounded bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">
            Built for Inclusive Learning
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow">
          <p className="mb-4 text-sm font-semibold">EduQuest AI</p>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mb-4 mt-1 text-xs text-gray-500">{subtitle}</p>}
          {children}
        </div>
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
    <Shell title="Welcome back!" subtitle="Please enter your details.">
      <form onSubmit={submitCredentials}>
        <label className="text-xs font-medium" htmlFor="email">
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
        <label className="text-xs font-medium" htmlFor="password">
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
