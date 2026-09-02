import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { Bird, ShieldCheck } from "lucide-react";

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
const authEndpoint = (path: string) =>
  apiBaseUrl ? new URL(path, `${apiBaseUrl}/`).toString() : path;

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [countryCode, setCountryCode] = useState("PL");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(authEndpoint(`/api/auth/${mode}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register"
          ? { email, password, name, companyName, countryCode }
          : { email, password }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Login failed.");
      navigate("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1017] px-4 py-10 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_30%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-red-500/25 bg-zinc-900/70 px-4 py-2 shadow-[0_10px_35px_rgba(239,68,68,0.18)] backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-600/10 text-red-400">
              <Bird className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">ERP</div>
              <div className="text-sm font-bold tracking-wide text-zinc-100">BLOODY TURKEY</div>
            </div>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-950/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <CardHeader className="pb-3 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-50">
              {mode === "login" ? "Secure sign in" : "Create your organization"}
            </CardTitle>
            <p className="mt-2 text-sm text-zinc-400">
              Intelligent poultry operations platform
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {mode === "register" && (
                <>
                  <label className="block text-sm font-medium text-zinc-200">
                    Your name
                    <input className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 outline-none ring-0 transition focus:border-red-500" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
                  </label>
                  <label className="block text-sm font-medium text-zinc-200">
                    Company name
                    <input className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 outline-none ring-0 transition focus:border-red-500" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
                  </label>
                  <label className="block text-sm font-medium text-zinc-200">
                    Country code
                    <input className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 uppercase outline-none transition focus:border-red-500" value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} required minLength={2} maxLength={2} />
                  </label>
                </>
              )}
              <label className="block text-sm font-medium text-zinc-200">
                Email
                <input className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 outline-none transition focus:border-red-500" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
              </label>
              <label className="block text-sm font-medium text-zinc-200">
                Password
                <input className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-50 outline-none transition focus:border-red-500" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 12 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} />
              </label>
              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
              <Button className="w-full bg-red-600 text-white hover:bg-red-500" size="lg" type="submit" disabled={pending}>
                {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              className="mt-4 w-full text-sm text-zinc-300 underline decoration-zinc-500 underline-offset-4 transition hover:text-zinc-100"
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            >
              {mode === "login" ? "Create the first organization account" : "I already have an account"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
