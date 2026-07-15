"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Eye, EyeOff, Waves } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) setMessage("Account created. Opening TradeSea…");
        else setMessage("Account created. Check your email to confirm it, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      if (/invalid login credentials/i.test(text)) setError("Email or password is incorrect. Create an account first if you are new.");
      else if (/user already registered/i.test(text)) setError("An account already exists with this email. Use Sign in.");
      else setError(text);
    } finally { setLoading(false); }
  }

  async function resetPassword() {
    setError(null); setMessage(null);
    if (!email.includes("@")) return setError("Enter your email first.");
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage("Password reset email sent.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send reset email."); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand-mark"><Waves size={24}/></div>
      <h1>TradeSea</h1>
      <p className="muted">Your private trading journal, synced across every device.</p>
      <div className="segmented">
        <button className={mode === "signin" ? "active" : ""} onClick={() => {setMode("signin"); setError(null); setMessage(null);}}>Sign in</button>
        <button className={mode === "signup" ? "active" : ""} onClick={() => {setMode("signup"); setError(null); setMessage(null);}}>Create account</button>
      </div>
      <form onSubmit={submit}>
        <label>Email<input autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<div className="password-wrap"><input autoComplete={mode === "signup" ? "new-password" : "current-password"} type={show ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/><button type="button" className="icon-btn" onClick={()=>setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {mode === "signin" && <button className="link-button" onClick={resetPassword}>Forgot password?</button>}
    </section>
  </main>;
}
