import { CONFIG } from '../config.js';
import type { DeviceCodeResponse } from './device-flow.js';

function isTrustedHostname(hostname: string): boolean {
  return hostname === 'developer.payermax.com' ||
    hostname.endsWith('.developer.payermax.com');
}

export function validateVerificationUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The verification URL returned by the server is invalid.');
  }

  const isAllowedLocalhost =
    CONFIG.ALLOW_INSECURE_LOCALHOST &&
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]');

  if (!isAllowedLocalhost && (url.protocol !== 'https:' || !isTrustedHostname(url.hostname))) {
    throw new Error('The verification URL returned by the server is not trusted.');
  }
  if (url.username || url.password) {
    throw new Error('The verification URL returned by the server must not contain credentials.');
  }

  return url.toString();
}

export function resolveVerificationUrl(response: DeviceCodeResponse): string {
  const complete = response.verificationUriComplete?.trim();
  if (complete) {
    try {
      return validateVerificationUrl(complete);
    } catch {
      // Support a partially rolled-out backend by rebuilding from the legacy fields.
    }
  }

  let url: URL;
  try {
    url = new URL(response.verificationUri);
  } catch {
    throw new Error('The verification URL returned by the server is invalid.');
  }
  url.searchParams.set('user_code', response.userCode);
  return validateVerificationUrl(url.toString());
}
