import { describe, it, expect, vi, beforeEach } from 'vitest';
import { oauthReturnPath } from './oauth-return-path';
import { consentDecision } from './oauth-consent';
const mocks = vi.hoisted(()=>({approve:vi.fn(),deny:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{oauth:{approveAuthorization:mocks.approve,denyAuthorization:mocks.deny}}}}));
beforeEach(()=>vi.clearAllMocks());
describe('OAuth return and decisions',()=>{
  it('preserves consent query and fragment',()=>expect(oauthReturnPath('/.lovable/oauth/consent?authorization_id=123#return')).toBe('/.lovable/oauth/consent?authorization_id=123#return'));
  it.each(['//outside.invalid','/\\outside.invalid','https://outside.invalid','/a\n/b'])('rejects nonlocal or malformed return %s', value=>expect(oauthReturnPath(value)).toBe('/'));
  it('approve returns the provider URL with exactly one redirect owner',async()=>{mocks.approve.mockResolvedValue({data:{redirect_url:'https://client.invalid/callback?code=ok'},error:null}); expect(await consentDecision('123',true)).toBe('https://client.invalid/callback?code=ok'); expect(mocks.approve).toHaveBeenCalledWith('123',{skipBrowserRedirect:true});});
  it('deny returns the access-denied provider URL',async()=>{mocks.deny.mockResolvedValue({data:{redirect_url:'https://client.invalid/callback?error=access_denied'},error:null}); expect(await consentDecision('123',false)).toContain('access_denied'); expect(mocks.deny).toHaveBeenCalledWith('123',{skipBrowserRedirect:true});});
  it('propagates failed decisions instead of fake success',async()=>{mocks.approve.mockResolvedValue({data:null,error:new Error('Expired request')}); await expect(consentDecision('123',true)).rejects.toThrow('Expired request');});
  it('rejects missing redirect results',async()=>{mocks.deny.mockResolvedValue({data:null,error:null});await expect(consentDecision('123',false)).rejects.toThrow('No redirect');});
});
