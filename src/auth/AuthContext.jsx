import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  // On page load, restore the session if a token is saved
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    api
      .get("/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (token) => {
    localStorage.setItem("token", token);
    const { data } = await api.get("/me");
    setUser(data);
    return data;
  };

  const signOut = async () => {
    try {
      await api.post("/logout");
    } catch {
      // the token may already be invalid; sign out locally anyway
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
