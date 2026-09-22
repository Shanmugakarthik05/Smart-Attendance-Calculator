
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AdminLogin } from "./app/components/AdminLogin.tsx";
import { AdminDashboard } from "./app/components/AdminDashboard.tsx";
import { AuthProvider, useAuth } from "./app/context/AuthContext.tsx";
import "./styles/index.css";

function Root() {
  const { isAdmin } = useAuth();
  const isAdminRoute = window.location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (isAdmin) return <AdminDashboard />;
    return <AdminLogin />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <Root />
  </AuthProvider>
);