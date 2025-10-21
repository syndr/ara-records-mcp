const { test } = require('node:test');
const assert = require('node:assert');

// We need to test createAuthHeaders which depends on ARA_USERNAME and ARA_PASSWORD
// Since these are constants evaluated at module load time, we need to control env vars

function requireWithEnv(env) {
  // Save original env vars
  const originalAraServer = process.env.ARA_API_SERVER;
  const originalUsername = process.env.ARA_USERNAME;
  const originalPassword = process.env.ARA_PASSWORD;

  // Clear module from cache
  delete require.cache[require.resolve('../ara-server.js')];

  // Set test environment (delete if undefined to truly unset)
  if (env.ARA_API_SERVER === undefined) {
    delete process.env.ARA_API_SERVER;
  } else {
    process.env.ARA_API_SERVER = env.ARA_API_SERVER;
  }

  if (env.ARA_USERNAME === undefined) {
    delete process.env.ARA_USERNAME;
  } else {
    process.env.ARA_USERNAME = env.ARA_USERNAME;
  }

  if (env.ARA_PASSWORD === undefined) {
    delete process.env.ARA_PASSWORD;
  } else {
    process.env.ARA_PASSWORD = env.ARA_PASSWORD;
  }

  // Require module with new env
  const module = require('../ara-server.js');

  // Restore original env
  if (originalAraServer === undefined) {
    delete process.env.ARA_API_SERVER;
  } else {
    process.env.ARA_API_SERVER = originalAraServer;
  }

  if (originalUsername === undefined) {
    delete process.env.ARA_USERNAME;
  } else {
    process.env.ARA_USERNAME = originalUsername;
  }

  if (originalPassword === undefined) {
    delete process.env.ARA_PASSWORD;
  } else {
    process.env.ARA_PASSWORD = originalPassword;
  }

  return module;
}

test('createAuthHeaders - returns headers without auth when no credentials', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: undefined,
    ARA_PASSWORD: undefined
  });

  const headers = createAuthHeaders();

  assert.strictEqual(headers['Content-Type'], 'application/json');
  assert.strictEqual(headers['User-Agent'], 'ara-records-mcp/1.0');
  assert.strictEqual(headers['Authorization'], undefined);
});

test('createAuthHeaders - returns headers without auth when only username provided', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: 'testuser',
    ARA_PASSWORD: undefined
  });

  const headers = createAuthHeaders();

  assert.strictEqual(headers['Authorization'], undefined);
});

test('createAuthHeaders - returns headers without auth when only password provided', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: undefined,
    ARA_PASSWORD: 'testpass'
  });

  const headers = createAuthHeaders();

  assert.strictEqual(headers['Authorization'], undefined);
});

test('createAuthHeaders - returns headers with Basic auth when both credentials provided', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: 'admin',
    ARA_PASSWORD: 'secret'
  });

  const headers = createAuthHeaders();

  assert.strictEqual(headers['Content-Type'], 'application/json');
  assert.strictEqual(headers['User-Agent'], 'ara-records-mcp/1.0');
  assert.ok(headers['Authorization'], 'Authorization header should exist');
  assert.ok(headers['Authorization'].startsWith('Basic '), 'Should start with "Basic "');
});

test('createAuthHeaders - encodes credentials correctly in base64', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: 'testuser',
    ARA_PASSWORD: 'testpass'
  });

  const headers = createAuthHeaders();

  // Manually encode to verify
  const expectedAuth = 'Basic ' + Buffer.from('testuser:testpass').toString('base64');
  assert.strictEqual(headers['Authorization'], expectedAuth);
});

test('createAuthHeaders - handles special characters in credentials', () => {
  const { createAuthHeaders } = requireWithEnv({
    ARA_USERNAME: 'user@example.com',
    ARA_PASSWORD: 'p@ssw0rd!#$%'
  });

  const headers = createAuthHeaders();

  const expectedAuth = 'Basic ' + Buffer.from('user@example.com:p@ssw0rd!#$%').toString('base64');
  assert.strictEqual(headers['Authorization'], expectedAuth);
});
