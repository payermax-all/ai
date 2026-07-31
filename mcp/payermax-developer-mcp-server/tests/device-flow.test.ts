import { jest } from '@jest/globals';
import { DeviceFlow } from '../src/auth/device-flow';

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as Response;
}

describe('DeviceFlow', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('preserves both legacy codes and verificationUriComplete', async () => {
    const data = {
      deviceCode: 'device-code',
      userCode: 'ABCD-1234',
      verificationUri: 'https://developer.payermax.com/oauth2/device',
      verificationUriComplete: 'https://developer.payermax.com/oauth2/device?user_code=ABCD-1234',
      expiresIn: 300,
      interval: 5,
    };
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      code: 'APPLY_SUCCESS',
      data,
    }));

    await expect(new DeviceFlow().requestDeviceCode()).resolves.toEqual(data);
  });

  it('continues through authorization_pending and returns the token', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: 'authorization_pending' }))
      .mockResolvedValueOnce(jsonResponse({
        code: 'APPLY_SUCCESS',
        data: {
          accessToken: 'access-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        },
      }));

    const polling = new DeviceFlow().startPolling('device-code', 5);
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(polling).resolves.toEqual(expect.objectContaining({
      accessToken: 'access-token',
    }));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('honors slow_down and rejects an expired device code', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ code: 'slow_down' }))
      .mockResolvedValueOnce(jsonResponse({ code: 'expired_token' }));

    const polling = new DeviceFlow().startPolling('device-code', 5);
    const rejection = expect(polling).rejects.toThrow('Device code expired');
    await jest.advanceTimersByTimeAsync(15_000);

    await rejection;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
