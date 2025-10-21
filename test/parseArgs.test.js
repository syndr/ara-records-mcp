const { test } = require('node:test');
const assert = require('node:assert');

// We can't easily test parseArgs via module import because process.argv
// is read at module load time. Instead, we'll call parseArgs directly
// after setting process.argv in each test.
function getParseArgsWithArgv(args) {
  const originalArgv = process.argv;
  process.argv = ['node', 'ara-server.js', ...args];

  // Clear cache and reload
  delete require.cache[require.resolve('../ara-server.js')];
  const { parseArgs } = require('../ara-server.js');

  // Call the function
  const result = parseArgs();

  // Restore
  process.argv = originalArgv;

  return result;
}

test('parseArgs - returns empty config with no arguments', () => {
  const config = getParseArgsWithArgv([]);
  assert.deepStrictEqual(config, {});
});

test('parseArgs - parses --api-server flag', () => {
  const config = getParseArgsWithArgv(['--api-server', 'http://test.example.com']);
  assert.strictEqual(config.apiServer, 'http://test.example.com');
});

test('parseArgs - parses --username flag', () => {
  const config = getParseArgsWithArgv(['--username', 'testuser']);
  assert.strictEqual(config.username, 'testuser');
});

test('parseArgs - parses --password flag', () => {
  const config = getParseArgsWithArgv(['--password', 'testpass']);
  assert.strictEqual(config.password, 'testpass');
});

test('parseArgs - parses multiple flags together', () => {
  const config = getParseArgsWithArgv([
    '--api-server', 'http://test.com',
    '--username', 'admin',
    '--password', 'secret'
  ]);
  assert.deepStrictEqual(config, {
    apiServer: 'http://test.com',
    username: 'admin',
    password: 'secret'
  });
});

test('parseArgs - ignores flags without values', () => {
  const config = getParseArgsWithArgv(['--api-server']);
  assert.deepStrictEqual(config, {});
});

test('parseArgs - handles flags in any order', () => {
  const config = getParseArgsWithArgv([
    '--password', 'pass123',
    '--api-server', 'http://example.com',
    '--username', 'user1'
  ]);
  assert.strictEqual(config.apiServer, 'http://example.com');
  assert.strictEqual(config.username, 'user1');
  assert.strictEqual(config.password, 'pass123');
});
