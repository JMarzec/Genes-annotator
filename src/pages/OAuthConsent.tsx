import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Narrow typed wrapper for the beta supabase.auth.oauth namespace.
interface AuthorizationDetails {
  client?: { name?: string; redirect_uris?: string[]; client_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
}
interface OAuthResult { data?: AuthorizationDetails; error?: { message: string } }
const authOauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? null);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorizationId)
      : await authOauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Helmet>
        <title>Authorize connection — OncoGene Annotator</title>
      </Helmet>
      <div className="w-full max-w-md border rounded-lg bg-card p-6 shadow-sm">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-foreground mb-2">Cannot load this request</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="text-lg font-bold text-foreground mb-1">
              Connect {details.client?.name ?? "an app"} to OncoGene Annotator
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {details.client?.name ?? "The client"} will be able to call OncoGene Annotator's MCP tools while you are signed in.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-6 list-disc pl-4">
              <li>Share your basic profile and email</li>
              <li>Call read-only gene-annotation tools (CIViC, DGIdb, MyGene)</li>
              <li>This does not bypass this app's permissions or backend policies.</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={() => decide(true)} disabled={busy} className="flex-1">Approve</Button>
              <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">Deny</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthConsent;
