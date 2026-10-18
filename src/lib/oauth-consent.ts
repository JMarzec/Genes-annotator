import { supabase } from '@/integrations/supabase/client';
export async function consentDecision(id: string, approve: boolean) {
  if (!id) throw new Error('Missing authorization ID.');
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (error) throw error;
  if (!data?.redirect_url) throw new Error('No redirect returned by the authorization server.');
  return data.redirect_url;
}
