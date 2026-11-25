import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, cx } from "../components/ui";

// The Figma board gives the Teacher a different sidebar from the Master Teacher
const MASTER_NAV = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/users", label: "User Management" },
  { to: "/app/sections", label: "Sections" },
  { to: "/app/records", label: "Student Records" },
  { to: "/app/content", label: "Learning Content" },
  { to: "/app/reports", label: "Audit Log & Reports" },
  { to: "/app/settings", label: "Settings" },
];

const TEACHER_NAV = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/users", label: "Section & Learners" },
  { to: "/app/content", label: "Gamified Lessons" },
  { to: "/app/records", label: "Student Records" },
  { to: "/app/reports", label: "Reports & Analytics" },
  { to: "/app/settings", label: "Settings" },
];

function UserMenu({ user, roleLabel, signOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-gray-50"
      >
        <Avatar name={user.full_name ?? user.email} src={user.photo} />
        <span className="hidden sm:block">
          <span className="block text-sm font-medium">{user.full_name ?? user.email}</span>
          <span className="block text-xs text-gray-500">{roleLabel}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-lg bg-white p-1 text-sm shadow-lg ring-1 ring-black/10">
          <Link role="menuitem" to="/app/profile" className="block rounded-md px-3 py-2 hover:bg-gray-50">
            View Profile
          </Link>
          <Link role="menuitem" to="/app/settings" className="block rounded-md px-3 py-2 hover:bg-gray-50">
            Account &amp; 2FA Settings
          </Link>
          <button role="menuitem" onClick={signOut} className="block w-full rounded-md px-3 py-2 text-left hover:bg-gray-50">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function StaffLayout() {
  const { user, signOut } = useAuth();
  const master = user.role.name === "master_teacher";
  const nav = master ? MASTER_NAV : TEACHER_NAV;
  const roleLabel = master ? "Master Teacher" : "Teacher";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">EQ</span>
          <div>
            <p className="text-sm font-semibold leading-tight">EduQuest AI</p>
            <p className="text-xs text-gray-500">San Mateo Elementary School</p>
          </div>
        </div>
        <UserMenu user={user} roleLabel={roleLabel} signOut={signOut} />
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white p-3 md:w-56 md:flex-col md:border-b-0 md:border-r print:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  isActive ? "bg-red-50 font-semibold text-brand" : "text-gray-700 hover:bg-gray-100"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="mt-auto whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </nav>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
