import { CONFIG } from '../config.js';

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId?: string;
  email?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class DeviceFlow {
  private polling = false;

  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const resp = await fetch(`${CONFIG.API_BASE_URL}/oauth2/device/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: CONFIG.CLIENT_ID }),
    });
    const json = await resp.json() as any;
    if (json.code !== 'APPLY_SUCCESS') {
      throw new Error(json.msg || 'Failed to request device code');
    }
    return json.data;
  }

  async startPolling(deviceCode: string, intervalSeconds?: number): Promise<TokenResponse> {
    this.polling = true;
    const startTime = Date.now();
    const pollIntervalMs = Math.max(
      CONFIG.POLL_INTERVAL_MS,
      (intervalSeconds ?? 0) * 1000,
    );

    while (this.polling) {
      if (Date.now() - startTime > CONFIG.POLL_TIMEOUT_MS) {
        this.polling = false;
        throw new Error('Device code expired. Please try again.');
      }

      await sleep(pollIntervalMs);

      const resp = await fetch(`${CONFIG.API_BASE_URL}/oauth2/device/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode, clientId: CONFIG.CLIENT_ID }),
      });

      const json = await resp.json() as any;

      if (json.code === 'APPLY_SUCCESS' && json.data?.accessToken) {
        this.polling = false;
        return json.data;
      }

      // authorization_pending — keep polling
      if (json.code === 'authorization_pending') {
        continue;
      }

      // slow_down — extra wait
      if (json.code === 'slow_down') {
        await sleep(pollIntervalMs);
        continue;
      }

      // expired or other error
      if (json.code === 'expired_token') {
        this.polling = false;
        throw new Error('Device code expired. Please try again.');
      }

      // Keep polling for any unrecognized pending state
      continue;
    }

    throw new Error('Polling cancelled');
  }

  isPolling(): boolean {
    return this.polling;
  }

  cancel(): void {
    this.polling = false;
  }
}
