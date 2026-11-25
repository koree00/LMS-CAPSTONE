import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { fmtDate } from "../../lib/csv";
import { useAuth } from "../../auth/AuthContext";
import PasswordForm from "../../components/PasswordForm";
import { ProgressBar } from "../../components/ui";

const REASONS = { lesson_complete: "Finished a lesson", weekly_game: "Weekly game", reward_claim: "Avatar shop" };

const TABS = [
  { id: "account", label: "Account Information", icon: "👤" },
  { id: "comfort", label: "Sensory Comfort", icon: "🎨" },
  { id: "records", label: "Records", icon: "📜" },
];

const THEMES = [
  { id: "calm", label: "Calm green", color: "#e6edd8" },
  { id: "light", label: "Light", color: "#fbfbf7" },
  { id: "dark", label: "Dark", color: "#23262b" },
];

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/70 px-4 py-3 text-lg font-bold" style={{ color: "#2b2b2b" }}>
      {label}
      <input type="checkbox" className="h-6 w-6" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Comfort() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => get("/my/profile") });
  const prefs = profile.data?.sensory_preferences;

  const save = useMutation({
    mutationFn: (patch) => api.patch("/my/profile", { sensory_preferences: patch }),
    onSuccess: (res) => qc.setQueryData(["profile"], res.data),
  });

  if (!prefs) return <p className="font-bold">Loading…</p>;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h2 className="mb-2 text-xl font-extrabold">Choose the color of the home screen</h2>
        <div className="flex gap-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              aria-label={t.label}
              aria-pressed={prefs.theme === t.id}
              onClick={() => save.mutate({ theme: t.id })}
              className="h-16 w-16 rounded-full"
              style={{ background: t.color, border: prefs.theme === t.id ? "5px solid #14b8a6" : "3px solid #777" }}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-extrabold">Text size</h2>
        <div className="flex gap-3">
          {["small", "medium", "large"].map((s) => (
            <button
              key={s}
              aria-pressed={prefs.text_size === s}
              onClick={() => save.mutate({ text_size: s })}
              className="kid-pill px-5 py-2 capitalize"
              style={{ borderColor: prefs.text_size === s ? "#14b8a6" : "transparent" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Toggle label="Less motion" checked={prefs.reduced_motion} onChange={(v) => save.mutate({ reduced_motion: v })} />
        <Toggle label="Stronger outlines" checked={prefs.high_contrast} onChange={(v) => save.mutate({ high_contrast: v })} />
        <Toggle label="Sounds" checked={prefs.sound} onChange={(v) => save.mutate({ sound: v })} />
      </div>
      {save.isError && <p role="alert" className="font-bold">{errMsg(save.error)}</p>}
    </div>
  );
}

function Records() {
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => get("/my/progress") });
  const rewards = useQuery({ queryKey: ["my-rewards"], queryFn: () => get("/my/rewards") });
  const stars = useQuery({ queryKey: ["stars"], queryFn: () => get("/my/coins") });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section>
        <h2 className="mb-2 text-xl font-extrabold">My lessons</h2>
        {progress.data?.length ? (
          <div className="space-y-2">
            {progress.data.map((l) => (
              <div key={l.lesson_id} className="rounded-2xl bg-white/70 p-3 text-[#2b2b2b]">
                <p className="font-bold">{l.title}</p>
                <ProgressBar value={l.completion_pct} />
              </div>
            ))}
          </div>
        ) : (
          <p className="font-bold">No lessons yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">My avatar items</h2>
        {rewards.data?.length ? (
          <ul className="space-y-2">
            {rewards.data.map((r) => (
              <li key={r.reward_id} className="rounded-2xl bg-white/70 p-3 font-bold text-[#2b2b2b]">
                {r.emoji || "🎁"} {r.reward_name} <span className="text-sm font-semibold">· {fmtDate(r.claimed_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-bold">No items yet. Visit the avatar shop!</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">My stars: ⭐ {stars.data?.balance ?? 0}</h2>
        <ul className="space-y-1">
          {stars.data?.recent.map((t) => (
            <li key={t.transaction_id} className="rounded-xl bg-white/70 px-3 py-2 font-semibold text-[#2b2b2b]">
              {t.amount > 0 ? "+" : ""}
              {t.amount} · {REASONS[t.reason] ?? "Stars"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState("account");

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/student" className="kid-pill px-4 py-2">
          ← Go back
        </Link>
        <button className="kid-pill px-4 py-2" onClick={signOut}>
          Log out
        </button>
      </div>

      <section className="rounded-3xl p-6" style={{ background: "var(--kid-pink)", color: "var(--kid-ink)" }}>
        <div className="mb-6 flex flex-wrap justify-center gap-3" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="kid-pill px-5 py-2 text-lg"
              style={{ borderColor: tab === t.id ? "#14b8a6" : "transparent" }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "account" && (
          <div className="mx-auto max-w-sm">
            <p className="mb-4 rounded-2xl bg-white/70 px-4 py-3 text-lg font-bold text-[#2b2b2b]">Email: {user.email}</p>
            <h2 className="mb-2 text-xl font-extrabold">Change password</h2>
            <div className="rounded-2xl bg-white p-4 text-[#2b2b2b]">
              <PasswordForm />
            </div>
          </div>
        )}
        {tab === "comfort" && <Comfort />}
        {tab === "records" && <Records />}
      </section>
    </>
  );
}
