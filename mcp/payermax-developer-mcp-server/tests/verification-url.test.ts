import {
  resolveVerificationUrl,
  validateVerificationUrl,
} from '../src/auth/verification-url';
import type { DeviceCodeResponse } from '../src/auth/device-flow';

function response(overrides: Partial<DeviceCodeResponse> = {}): DeviceCodeResponse {
  return {
    deviceCode: 'device-code',
    userCode: 'ABCD-12 34',
    verificationUri: 'https://developer.payermax.com/oauth2/device',
    expiresIn: 300,
    interval: 5,
    ...overrides,
  };
}

describe('verification URL resolution', () => {
  it('prefers the complete URL returned by the backend', () => {
    const complete = 'https://developer.payermax.com/oauth2/device?user_code=SERVER-CODE';
    expect(resolveVerificationUrl(response({
      verificationUriComplete: complete,
    }))).toBe(complete);
  });

  it('builds a complete URL for legacy backend responses', () => {
    const resolved = new URL(resolveVerificationUrl(response()));
    expect(resolved.searchParams.get('user_code')).toBe('ABCD-12 34');
  });

  it('preserves existing query parameters while replacing user_code', () => {
    const resolved = new URL(resolveVerificationUrl(response({
      verificationUri: 'https://developer.payermax.com/oauth2/device?source=mcp&user_code=old',
    })));
    expect(resolved.searchParams.get('source')).toBe('mcp');
    expect(resolved.searchParams.get('user_code')).toBe('ABCD-12 34');
    expect(resolved.search).toContain('user_code=ABCD-12+34');
  });

  it('falls back to legacy fields when the complete URL is untrusted', () => {
    const resolved = resolveVerificationUrl(response({
      verificationUriComplete: 'https://attacker.example/oauth2/device?user_code=stolen',
    }));
    expect(resolved).toContain('developer.payermax.com');
    expect(new URL(resolved).searchParams.get('user_code')).toBe('ABCD-12 34');
  });

  it.each([
    'http://developer.payermax.com/oauth2/device',
    'javascript:alert(1)',
    'file:///tmp/device',
    'https://developer.payermax.com.attacker.example/oauth2/device',
    'not a url',
  ])('rejects unsafe or malformed URL %s', value => {
    expect(() => validateVerificationUrl(value)).toThrow();
  });
});
