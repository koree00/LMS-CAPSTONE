import { useEffect } from "react";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Card({ className, children }) {
  return (
    <div className={cx("rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5", className)}>
      {children}
    </div>
  );
}

const BUTTONS = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  ghost: "bg-white text-ink ring-1 ring-black/15 hover:bg-gray-50",
  danger: "bg-white text-brand ring-1 ring-brand/40 hover:bg-red-50",
};

export function Button({ variant = "primary", className, ...props }) {
  return (
    <button
      className={cx(
        "rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50",
        BUTTONS[variant],
        className
      )}
      {...props}
    />
  );
}

export const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function Field({ label, hint, children }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input className={inputCls} {...props} />;

export const Select = ({ children, ...props }) => (
  <select className={inputCls} {...props}>
    {children}
  </select>
);

export function ErrorText({ children }) {
  return children ? (
    <p role="alert" className="mb-3 text-sm text-brand">
      {children}
    </p>
  ) : null;
}

export function Loading({ label = "Loading…" }) {
  return <p className="py-6 text-center text-sm text-gray-500">{label}</p>;
}

const TONES = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  gray: "bg-gray-100 text-gray-700",
};

export function Badge({ tone = "gray", children }) {
  return (
    <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <Card>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value ?? "—"}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none text-gray-500">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty = "Nothing here yet.", onRowClick }) {
  if (!rows?.length) return <p className="py-8 text-center text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            {columns.map((c) => (
              <th key={c.label} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? row.user_id ?? row.section_id ?? row.lesson_id ?? row.game_id ?? row.reward_id ?? row.audit_id ?? row.student_id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx("border-b border-gray-100", onRowClick && "cursor-pointer hover:bg-gray-50")}
            >
              {columns.map((c) => (
                <td key={c.label} className="px-3 py-3 align-middle">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, last, onPage }) {
  if (!last || last <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {last}
      </span>
      <Button variant="ghost" disabled={page >= last} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
            value === t.value ? "border-brand text-brand" : "border-transparent text-gray-600 hover:text-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={pct}>
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, src, size = 36 }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = String(name || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-red-100 font-semibold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx("relative h-6 w-11 rounded-full transition-colors disabled:opacity-50", checked ? "bg-brand" : "bg-gray-300")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

// Two bars per group: completed (solid) and in progress (light)
export function BarChart({ data, empty = "No progress yet." }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-gray-500">{empty}</p>;
  const max = Math.max(1, ...data.flatMap((d) => [d.completed, d.in_progress]));
  return (
    <div>
      <div className="flex h-40 items-end border-b border-gray-200">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 items-end justify-center gap-1">
            <div
              className="w-6 rounded-t bg-brand"
              style={{ height: `${(d.completed / max) * 100}%` }}
              title={`${d.label}: ${d.completed} completed`}
            />
            <div
              className="w-6 rounded-t bg-red-300"
              style={{ height: `${(d.in_progress / max) * 100}%` }}
              title={`${d.label}: ${d.in_progress} in progress`}
            />
          </div>
        ))}
      </div>
      <div className="flex pt-1 text-xs text-gray-600">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-red-300" /> In progress
        </span>
      </div>
    </div>
  );
}
