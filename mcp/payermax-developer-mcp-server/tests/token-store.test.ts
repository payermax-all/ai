import { TokenStore, Credentials } from '../src/auth/token-store';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('TokenStore', () => {
  const store = new TokenStore();
  const credsDir = join(homedir(), '.payermax');
  const credsFile = join(credsDir, 'credentials.json');

  afterEach(() => {
    store.clear();
  });

  it('should return null when no credentials exist', () => {
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('should save and load credentials', () => {
    const creds: Credentials = {
      accessToken: 'test-token-123',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      email: 'test@example.com',
    };
    store.save(creds);

    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.accessToken).toBe('test-token-123');
    expect(loaded!.email).toBe('test@example.com');
  });

  it('should report valid when token not expired', () => {
    const creds: Credentials = {
      accessToken: 'test-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    store.save(creds);
    expect(store.isValid()).toBe(true);
  });

  it('should report invalid when token expired', () => {
    const creds: Credentials = {
      accessToken: 'test-token',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    store.save(creds);
    expect(store.isValid()).toBe(false);
  });

  it('should not treat userId as an access token', () => {
    store.save({
      accessToken: '',
      userId: 'display-only-user',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(store.isValid()).toBe(false);
  });

  it('should clear credentials', () => {
    const creds: Credentials = {
      accessToken: 'test-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    store.save(creds);
    store.clear();
    expect(store.load()).toBeNull();
    expect(store.isValid()).toBe(false);
  });
});
