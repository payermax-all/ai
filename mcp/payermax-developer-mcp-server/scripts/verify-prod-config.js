#!/usr/bin/env node
/**
 * Guard executed by the `prepack` npm hook.
 *
 * Ensures src/config.ts still declares the production API base URL before the
 * package is packed or published. Non-production environments must be selected
 * at runtime via the PAYERMAX_MCP_API_BASE_URL environment variable, never by
 * editing the source default.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROD_URL = 'https://mmc-gateway-uat.payermax.com/developer-mcp/stdio';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(projectRoot, 'src', 'config.ts');

let source;
try {
  source = readFileSync(configPath, 'utf8');
} catch (error) {
  console.error(`❌ Cannot read ${configPath}: ${error.message}`);
  process.exit(1);
}

const prodConstMatch = source.match(/PROD_API_BASE_URL\s*=\s*'([^']+)'/);
if (!prodConstMatch) {
  console.error('❌ Cannot find PROD_API_BASE_URL declaration in src/config.ts');
  process.exit(1);
}

if (prodConstMatch[1] !== PROD_URL) {
  console.error('❌ PROD_API_BASE_URL is not the production URL.');
  console.error(`   Expected: ${PROD_URL}`);
  console.error(`   Found:    ${prodConstMatch[1]}`);
  console.error('   Revert the local test URL before running npm pack/publish.');
  console.error('   For non-production testing set PAYERMAX_MCP_API_BASE_URL instead.');
  process.exit(1);
}

const apiBaseUrlLine = source.match(/API_BASE_URL:\s*(.+)/);
if (!apiBaseUrlLine) {
  console.error('❌ Cannot find API_BASE_URL in src/config.ts');
  process.exit(1);
}

if (!apiBaseUrlLine[1].includes('PROD_API_BASE_URL')) {
  console.error('❌ API_BASE_URL must fall back to PROD_API_BASE_URL.');
  console.error(`   Found: API_BASE_URL: ${apiBaseUrlLine[1].trim()}`);
  console.error('   Expected it to reference PROD_API_BASE_URL as the default.');
  process.exit(1);
}

console.log('✅ Production API base URL verified');
