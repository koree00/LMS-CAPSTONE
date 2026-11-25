import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Teacher and Master Teacher share one interface at /app
export const HOME = {
  master_teacher: "/app",
  teacher: "/app",
  student: "/student",
};

export default function RequireRole({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role.name)) {
    return <Navigate to={HOME[user.role.name]} replace />;
  }
  return <Outlet />;
}
