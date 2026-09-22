import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Eye, EyeOff, LogIn, ShieldCheck, AlertCircle } from "lucide-react";

export function AdminLogin() {
  const { login } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Small artificial delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const success = login(id.trim(), password);
    setLoading(false);

    if (!success) {
      setError("Invalid admin ID or password.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0b0f1a]">
      {/* Animated gradient blobs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
          top: "-100px",
          left: "-100px",
          animation: "floatBlob1 12s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
          bottom: "-80px",
          right: "-80px",
          animation: "floatBlob2 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
          top: "50%",
          left: "60%",
          animation: "floatBlob3 20s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px, 60px) scale(1.1); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-50px, -40px) scale(1.08); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px, 50px) scale(1.05); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.5s ease; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .pulse-ring:focus { animation: pulse-ring 1.2s infinite; }
      `}</style>

      {/* Card */}
      <div
        className={`fade-in-up relative z-10 w-full max-w-md mx-4 ${shake ? "shake" : ""}`}
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          padding: "48px 40px",
        }}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div
            className="p-4 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Admin Portal
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.7)" }}>
              Semester Attendance Calculator
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8",
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Restricted Access
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Admin ID */}
          <div className="space-y-2">
            <label
              htmlFor="admin-id"
              className="block text-sm font-medium"
              style={{ color: "rgba(203,213,225,0.9)" }}
            >
              Admin ID
            </label>
            <input
              id="admin-id"
              type="text"
              autoComplete="username"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder="Enter your admin ID"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 pulse-ring"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.background = "rgba(99,102,241,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium"
              style={{ color: "rgba(203,213,225,0.9)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200 pulse-ring"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.background = "rgba(99,102,241,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "rgba(148,163,184,0.6)" }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !id || !password}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            style={{
              background: loading || !id || !password
                ? "rgba(99,102,241,0.4)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              cursor: loading || !id || !password ? "not-allowed" : "pointer",
              boxShadow: loading || !id || !password ? "none" : "0 4px 24px rgba(99,102,241,0.4)",
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In as Admin
              </>
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="text-center text-xs mt-8" style={{ color: "rgba(100,116,139,0.7)" }}>
          © {new Date().getFullYear()} SK TECH · Admin Portal
        </p>
      </div>
    </div>
  );
}
