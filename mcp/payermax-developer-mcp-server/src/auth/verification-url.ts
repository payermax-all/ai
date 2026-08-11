import { CONFIG } from '../config.js';
import type { DeviceCodeResponse } from './device-flow.js';

function isTrustedHostname(hostname: string): boolean {
  return CONFIG.VERIFICATION_URL_ALLOWED_HOSTNAMES.some(allowedHostname => {
    if (allowedHostname.startsWith('*.')) {
      return hostname.endsWith(`.${allowedHostname.slice(2)}`);
    }
    return hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`);
  });
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
  if (!complete) {
    throw new Error('The server did not return a complete verification URL.');
  }

  return validateVerificationUrl(complete);
}
