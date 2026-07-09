import { CONFIG } from '../config.js';
import { TokenStore } from '../auth/token-store.js';
import { checkVersionHeaders } from './version-check.js';
import { AuthenticationRequiredError } from '../utils/errors.js';

export class ApiClient {
  private tokenStore: TokenStore;

  constructor(tokenStore: TokenStore) {
    this.tokenStore = tokenStore;
  }

  async get(path: string, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request('GET', path, undefined, options);
  }

  async post(path: string, body?: any, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request('POST', path, body, options);
  }

  async put(path: string, body?: any, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request('PUT', path, body, options);
  }

  async delete(path: string, options?: { headers?: Record<string, string>; noAuth?: boolean }) {
    return this.request('DELETE', path, undefined, options);
  }

  private async request(
    method: string,
    path: string,
    body?: any,
    options?: { headers?: Record<string, string>; noAuth?: boolean }
  ) {
    const url = `${CONFIG.API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (!options?.noAuth) {
      const creds = this.tokenStore.load();
      if (!creds || !this.tokenStore.isValid()) {
        throw new AuthenticationRequiredError();
      }
      headers['Authorization'] = `Bearer ${creds.accessToken}`;
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Check version headers
    checkVersionHeaders(resp.headers);

    const json = await resp.json() as any;

    // Handle 401
    if (resp.status === 401) {
      this.tokenStore.clear();
      throw new Error('Token expired or invalid. Please run authenticate again.');
    }

    // Handle business errors
    if (json.code && json.code !== 'APPLY_SUCCESS') {
      throw new Error(json.msg || `API error: ${json.code}`);
    }

    return json;
  }
}
