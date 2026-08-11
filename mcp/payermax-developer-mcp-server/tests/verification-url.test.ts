import {
  resolveVerificationUrl,
  validateVerificationUrl,
} from '../src/auth/verification-url';
import { CONFIG } from '../src/config';
import type { DeviceCodeResponse } from '../src/auth/device-flow';

function response(overrides: Partial<DeviceCodeResponse> = {}): DeviceCodeResponse {
  return {
    deviceCode: 'device-code',
    userCode: 'ABCD-12 34',
    verificationUriComplete: 'https://developer.payermax.com/oauth2/device?user_code=SERVER-CODE',
    expiresIn: 300,
    interval: 5,
    ...overrides,
  };
}

describe('verification URL resolution', () => {
  const defaultAllowedHostnames = CONFIG.VERIFICATION_URL_ALLOWED_HOSTNAMES;

  afterEach(() => {
    CONFIG.VERIFICATION_URL_ALLOWED_HOSTNAMES = defaultAllowedHostnames;
  });

  it('uses the complete URL returned by the backend', () => {
    const complete = 'https://developer.payermax.com/oauth2/device?user_code=SERVER-CODE';
    expect(resolveVerificationUrl(response({
      verificationUriComplete: complete,
    }))).toBe(complete);
  });

  it('uses the configured hostname allowlist, including subdomains', () => {
    CONFIG.VERIFICATION_URL_ALLOWED_HOSTNAMES = ['verification.example.test'];

    expect(validateVerificationUrl(
      'https://uat.verification.example.test/oauth2/device?user_code=SERVER-CODE',
    )).toBe('https://uat.verification.example.test/oauth2/device?user_code=SERVER-CODE');
    expect(() => validateVerificationUrl(
      'https://developer.payermax.com/oauth2/device?user_code=SERVER-CODE',
    )).toThrow('not trusted');
  });

  it('uses wildcard hostname entries for subdomains only', () => {
    CONFIG.VERIFICATION_URL_ALLOWED_HOSTNAMES = ['*.payermax.com'];

    expect(validateVerificationUrl(
      'https://sandbox.payermax.com/oauth2/device?user_code=SERVER-CODE',
    )).toBe('https://sandbox.payermax.com/oauth2/device?user_code=SERVER-CODE');
    expect(() => validateVerificationUrl(
      'https://payermax.com/oauth2/device?user_code=SERVER-CODE',
    )).toThrow('not trusted');
  });

  it('rejects insecure localhost by default', () => {
    expect(() => validateVerificationUrl(
      'http://localhost:3000/oauth2/device?user_code=SERVER-CODE',
    )).toThrow('not trusted');
  });

  it('rejects a missing complete URL', () => {
    expect(() => resolveVerificationUrl(response({
      verificationUriComplete: ' ',
    }))).toThrow('complete verification URL');
  });

  it('rejects an untrusted complete URL', () => {
    expect(() => resolveVerificationUrl(response({
      verificationUriComplete: 'https://attacker.example/oauth2/device?user_code=stolen',
    }))).toThrow('not trusted');
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
