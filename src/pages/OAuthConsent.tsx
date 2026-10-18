import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { consentDecision } from '@/lib/oauth-consent';
import { Button } from '@/components/ui/button';
type Details = { client: { name: string }; scope: string };
const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<Details | null>(null), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setDetails(null); setError(null);
    const load = async () => {
      try {
        if (!authorizationId) throw new Error('Missing authorization_id');
        const { data: sess, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) throw sessionError;
        if (!sess.session) {
          const next = window.location.pathname + window.location.search + window.location.hash;
          window.location.assign('/login?next=' + encodeURIComponent(next)); return;
        }
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) throw error;
        if (!data) throw new Error('Authorization request is unavailable.');
        if ('redirect_url' in data) { window.location.assign(data.redirect_url); return; }
        setDetails({ client: { name: data.client.name ?? 'an app' }, scope: data.scope });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Cannot load this request.'); }
    };
    void load();
    return () => { active = false; };
  }, [authorizationId]);
  const decide = async (approve: boolean) => {
    setBusy(true); setError(null);
    try { window.location.assign(await consentDecision(authorizationId, approve)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete this decision.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-background flex items-center justify-center p-6">
    <Helmet><title>Authorize connection — OncoGene Annotator</title></Helmet>
    <div className="w-full max-w-md border rounded-lg bg-card p-6 shadow-sm">
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {!details ? <p>{error ? 'Cannot load this request' : 'Loading…'}</p> : <>
        <h1 className="text-lg font-bold mb-2">Connect {details.client.name} to OncoGene Annotator</h1>
        <p className="text-sm text-muted-foreground mb-4">This app can call read-only gene-annotation tools while connected to your account.</p>
        {details.scope && <p className="text-xs text-muted-foreground mb-4">Requested permissions: {details.scope}</p>}
        <div className="flex gap-2"><Button disabled={busy} onClick={() => void decide(true)} className="flex-1">Approve</Button><Button disabled={busy} variant="outline" onClick={() => void decide(false)} className="flex-1">Deny</Button></div>
      </>}
    </div>
  </main>;
};
export default OAuthConsent;
