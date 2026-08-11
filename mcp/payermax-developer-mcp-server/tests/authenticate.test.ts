import { jest } from '@jest/globals';
import { createAuthenticateHandler } from '../src/tools/authenticate';
import { TokenStore } from '../src/auth/token-store';
import type { DeviceCodeResponse, TokenResponse } from '../src/auth/device-flow';

const deviceResponse: DeviceCodeResponse = {
  deviceCode: 'private-device-code',
  userCode: 'ABCD-1234',
  verificationUriComplete: 'https://developer.payermax.com/oauth2/device?user_code=ABCD-1234',
  expiresIn: 300,
  interval: 7,
};

function createStore(valid = false): TokenStore {
  const store = new TokenStore();
  jest.spyOn(store, 'isValid').mockReturnValue(valid);
  jest.spyOn(store, 'load').mockReturnValue(valid ? {
    accessToken: 'existing-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    userId: 'display-user',
  } : null);
  jest.spyOn(store, 'save').mockImplementation(() => undefined);
  return store;
}

function createDeviceFlow(tokenPromise: Promise<TokenResponse> = new Promise(() => undefined)) {
  return {
    requestDeviceCode: jest.fn<() => Promise<DeviceCodeResponse>>().mockResolvedValue(deviceResponse),
    startPolling: jest.fn<(deviceCode: string, intervalSeconds?: number) => Promise<TokenResponse>>()
      .mockReturnValue(tokenPromise),
    isPolling: jest.fn<() => boolean>().mockReturnValue(true),
  };
}

describe('authenticate tool', () => {
  it('opens the complete URL and keeps device code only for polling', async () => {
    const store = createStore();
    const deviceFlow = createDeviceFlow();
    const opener = jest.fn<(url: string) => Promise<boolean>>().mockResolvedValue(true);

    const result = await createAuthenticateHandler(store, deviceFlow, opener)();

    expect(opener).toHaveBeenCalledWith(deviceResponse.verificationUriComplete);
    expect(deviceFlow.startPolling).toHaveBeenCalledWith('private-device-code', 7);
    expect(result.content[0].text).toContain(`Verification URL: ${deviceResponse.verificationUriComplete}`);
    expect(result.content[0].text).not.toContain('Code:');
    expect(result.content[0].text).not.toContain('enter the code');
    expect(result.content[0].text).not.toContain('private-device-code');
  });

  it('does not start device flow when a valid access token exists', async () => {
    const store = createStore(true);
    const deviceFlow = createDeviceFlow();
    const opener = jest.fn<(url: string) => Promise<boolean>>().mockResolvedValue(true);

    const result = await createAuthenticateHandler(store, deviceFlow, opener)();

    expect(deviceFlow.requestDeviceCode).not.toHaveBeenCalled();
    expect(deviceFlow.startPolling).not.toHaveBeenCalled();
    expect(opener).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('Already authenticated');
  });

  it('returns a copyable complete URL without a separate code when opening fails', async () => {
    const store = createStore();
    const deviceFlow = createDeviceFlow();
    const opener = jest.fn<(url: string) => Promise<boolean>>().mockResolvedValue(false);

    const result = await createAuthenticateHandler(store, deviceFlow, opener)();

    expect(result.content[0].text).toContain('could not be opened automatically');
    expect(result.content[0].text).toContain(`Verification URL: ${deviceResponse.verificationUriComplete}`);
    expect(result.content[0].text).not.toContain('Code:');
    expect(result.content[0].text).not.toContain('enter');
  });

  it('saves the access token and optional display metadata after polling', async () => {
    const store = createStore();
    const tokenResponse: TokenResponse = {
      accessToken: 'new-access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      userId: 'display-user',
      email: 'user@example.com',
    };
    const deviceFlow = createDeviceFlow(Promise.resolve(tokenResponse));

    await createAuthenticateHandler(store, deviceFlow, async () => true)();
    await new Promise(resolve => setImmediate(resolve));

    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: 'new-access-token',
      userId: 'display-user',
      email: 'user@example.com',
    }));
  });
});
