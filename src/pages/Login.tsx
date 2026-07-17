import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Dna } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const isSafeNext = (v: string | null): string => {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
};

const Login = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = isSafeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const returnUrl = `${window.location.origin}${next}`;

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: returnUrl },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Confirm your address to finish signing up." });
      }
    } catch (err) {
      toast({ title: "Sign-in failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
    if (res.error) {
      toast({ title: "Google sign-in failed", description: res.error.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    if (res.redirected) return;
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Sign in — OncoGene Annotator</title>
        <meta name="description" content="Sign in to OncoGene Annotator to connect external agents and integrations." />
      </Helmet>
      <header className="border-b bg-card">
        <div className="container max-w-6xl py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dna className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground tracking-tight">OncoGene Annotator</div>
              <p className="text-xs text-muted-foreground">Sign in</p>
            </div>
          </Link>
        </div>
      </header>
      <main className="flex-1 container max-w-md py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          You need an account to connect external agents (ChatGPT, Claude, Cursor, etc.) to this app via MCP.
        </p>

        <Button type="button" variant="outline" className="w-full mb-4" onClick={onGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="relative my-4 text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or with email</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground underline"
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </main>
    </div>
  );
};

export default Login;
