import { createLovableAuth } from '@lovable.dev/cloud-auth-js';
import { supabase } from '@/integrations/supabase/client';
const auth = createLovableAuth();
export async function cloudSignIn(provider: 'google' | 'lovable', redirect: string) {
  const result = await auth.signInWithOAuth(provider, { redirect_uri: redirect });
  if (result.redirected) return { redirected: true };
  if (result.error) throw result.error;
  const { data, error } = await supabase.auth.setSession(result.tokens);
  if (error) throw error;
  if (!data.session) throw new Error('Sign-in did not establish a session. Please try again.');
  return { redirected: false };
}
