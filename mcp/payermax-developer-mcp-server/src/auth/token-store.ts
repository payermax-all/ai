import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs';

const CREDENTIALS_DIR = join(homedir(), '.payermax');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

export interface Credentials {
  accessToken: string;
  expiresAt: string;
  email?: string;
  userId?: string;
}

export class TokenStore {
  load(): Credentials | null {
    if (!existsSync(CREDENTIALS_FILE)) return null;
    try {
      const raw = readFileSync(CREDENTIALS_FILE, 'utf-8');
      return JSON.parse(raw) as Credentials;
    } catch {
      return null;
    }
  }

  isValid(): boolean {
    const creds = this.load();
    if (!creds?.accessToken) return false;
    return new Date(creds.expiresAt) > new Date();
  }

  save(creds: Credentials): void {
    if (!existsSync(CREDENTIALS_DIR)) {
      mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2));
    chmodSync(CREDENTIALS_FILE, 0o600);
  }

  clear(): void {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  }
}
