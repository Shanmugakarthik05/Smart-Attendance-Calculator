import { createContext, useContext, useState, ReactNode } from "react";

const ADMIN_ID = "Leodas";
const ADMIN_PASS = "Leodas@";
const SESSION_KEY = "adminSession";

interface AuthContextType {
  isAdmin: boolean;
  login: (id: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const login = (id: string, password: string): boolean => {
    if (id === ADMIN_ID && password === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
