import { it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ login: vi.fn(), session: vi.fn() }));
vi.mock('@lovable.dev/cloud-auth-js', () => ({ createLovableAuth: () => ({ signInWithOAuth: mocks.login }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { setSession: mocks.session } } }));
import { cloudSignIn } from './cloud-signin';
it('propagates session-establishment errors returned without throwing', async () => {
  mocks.login.mockResolvedValue({ tokens: { access_token: 'test', refresh_token: 'test' } });
  mocks.session.mockResolvedValue({ data: { session: null }, error: new Error('Session failed') });
  await expect(cloudSignIn('google', 'https://app.invalid/.lovable/oauth/consent?authorization_id=123')).rejects.toThrow('Session failed');
});
