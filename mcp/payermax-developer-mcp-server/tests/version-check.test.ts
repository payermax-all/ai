import { checkVersionHeaders, setCurrentVersion } from '../src/api/version-check';
import { McpUpdateRequiredError } from '../src/utils/errors';

describe('Version Check', () => {
  beforeEach(() => {
    setCurrentVersion('1.0.0');
  });

  it('should not throw when no version header present', () => {
    const headers = new Headers();
    expect(() => checkVersionHeaders(headers)).not.toThrow();
  });

  it('should not throw when current version meets requirement', () => {
    const headers = new Headers();
    headers.set('PayerMax-Integration-Mcp-Min-Version', '1.0.0');
    expect(() => checkVersionHeaders(headers)).not.toThrow();
  });

  it('should not throw when current version exceeds requirement', () => {
    setCurrentVersion('2.0.0');
    const headers = new Headers();
    headers.set('PayerMax-Integration-Mcp-Min-Version', '1.0.0');
    expect(() => checkVersionHeaders(headers)).not.toThrow();
  });

  it('should throw when current version is below requirement', () => {
    const headers = new Headers();
    headers.set('PayerMax-Integration-Mcp-Min-Version', '2.0.0');
    expect(() => checkVersionHeaders(headers)).toThrow(McpUpdateRequiredError);
  });

  it('should not throw for invalid semver in header', () => {
    const headers = new Headers();
    headers.set('PayerMax-Integration-Mcp-Min-Version', 'invalid');
    expect(() => checkVersionHeaders(headers)).not.toThrow();
  });
});
