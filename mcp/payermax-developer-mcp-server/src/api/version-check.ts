import semver from 'semver';
import { McpUpdateRequiredError } from '../utils/errors.js';

let currentVersion = '1.0.0';

export function setCurrentVersion(version: string): void {
  currentVersion = version;
}

export function checkVersionHeaders(headers: Headers): void {
  const minVersion = headers.get('PayerMax-Integration-Mcp-Min-Version');
  if (minVersion && semver.valid(minVersion) && semver.lt(currentVersion, minVersion)) {
    throw new McpUpdateRequiredError(
      `Your MCP Server (v${currentVersion}) is outdated. ` +
      `Minimum required: v${minVersion}. ` +
      `Run npx payermax-developer-mcp-server@latest to install the latest version, then restart your IDE.`
    );
  }
}
