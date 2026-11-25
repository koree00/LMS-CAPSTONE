import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import RequireRole, { HOME } from "./auth/RequireRole";
import Login from "./pages/Login";
import StaffLayout from "./layouts/StaffLayout";
import StudentLayout from "./layouts/StudentLayout";
import Overview from "./pages/staff/Overview";
import Users from "./pages/staff/Users";
import Sections from "./pages/staff/Sections";
import Records from "./pages/staff/Records";
import Content from "./pages/staff/Content";
import Reports from "./pages/staff/Reports";
import StaffSettings from "./pages/staff/Settings";
import StaffProfile from "./pages/staff/Profile";
import Home from "./pages/student/Home";
import SubjectLessons from "./pages/student/SubjectLessons";
import Week from "./pages/student/Week";
import Lesson from "./pages/student/Lesson";
import Shop from "./pages/student/Shop";
import MyAvatar from "./pages/student/MyAvatar";
import StudentSettings from "./pages/student/Settings";

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? HOME[user.role.name] : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Master Teacher and Teacher share this interface */}
          <Route element={<RequireRole roles={["master_teacher", "teacher"]} />}>
            <Route path="/app" element={<StaffLayout />}>
              <Route index element={<Overview />} />
              <Route path="users" element={<Users />} />
              <Route path="sections" element={<Sections />} />
              <Route path="records" element={<Records />} />
              <Route path="content" element={<Content />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<StaffProfile />} />
              <Route path="settings" element={<StaffSettings />} />
            </Route>
          </Route>

          <Route element={<RequireRole roles={["student"]} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Home />} />
              <Route path="subjects/:slug" element={<SubjectLessons />} />
              <Route path="week" element={<Week />} />
              <Route path="lessons/:id" element={<Lesson />} />
              <Route path="shop" element={<Shop />} />
              <Route path="avatar" element={<MyAvatar />} />
              <Route path="settings" element={<StudentSettings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
