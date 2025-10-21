const { test } = require('node:test');
const assert = require('node:assert');

// addPaginationDefaults depends on ARA_API_SERVER constant
function requireWithEnv(env) {
  delete require.cache[require.resolve('../ara-server.js')];
  const originalEnv = { ...process.env };
  Object.assign(process.env, env);
  const module = require('../ara-server.js');
  process.env = originalEnv;
  return module;
}

test('addPaginationDefaults - adds default limit and order for playbooks', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks');

  assert.ok(result.includes('limit=3'), 'Should include limit=3');
  assert.ok(result.includes('order=-started'), 'Should include order=-started');
  assert.strictEqual(result, '/api/v1/playbooks?limit=3&order=-started');
});

test('addPaginationDefaults - adds default limit and order for plays', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/plays');

  assert.ok(result.includes('limit=3'));
  assert.ok(result.includes('order=-started'));
});

test('addPaginationDefaults - adds default limit and order for tasks', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/tasks');

  assert.ok(result.includes('limit=3'));
  assert.ok(result.includes('order=-started'));
});

test('addPaginationDefaults - adds default limit and order for results', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/results');

  assert.ok(result.includes('limit=3'));
  assert.ok(result.includes('order=-started'));
});

test('addPaginationDefaults - respects existing limit parameter', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks?limit=10');

  assert.ok(result.includes('limit=10'), 'Should keep existing limit=10');
  assert.ok(!result.includes('limit=3'), 'Should not add default limit=3');
  assert.ok(result.includes('order=-started'), 'Should still add default order');
});

test('addPaginationDefaults - respects existing order parameter', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks?order=started');

  assert.ok(result.includes('order=started'), 'Should keep existing order');
  assert.ok(!result.includes('order=-started'), 'Should not add default order');
  assert.ok(result.includes('limit=3'), 'Should still add default limit');
});

test('addPaginationDefaults - respects both existing limit and order', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks?limit=20&order=name');

  assert.ok(result.includes('limit=20'));
  assert.ok(result.includes('order=name'));
  assert.ok(!result.includes('limit=3'));
  assert.ok(!result.includes('order=-started'));
});

test('addPaginationDefaults - handles specific resource IDs (no defaults)', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks/123');

  // Should add limit but not order for specific resource
  assert.ok(result.includes('limit=3'));
  // Order is only added for endpoints containing /playbooks, /plays, /tasks, /results
  // A specific ID like /playbooks/123 still contains /playbooks, so order will be added
  assert.ok(result.includes('order=-started'));
});

test('addPaginationDefaults - adds only limit for non-chronological endpoints', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/hosts');

  assert.ok(result.includes('limit=3'), 'Should add default limit');
  assert.ok(!result.includes('order='), 'Should not add order for non-chronological endpoints');
});

test('addPaginationDefaults - preserves other query parameters', () => {
  const { addPaginationDefaults } = requireWithEnv({
    ARA_API_SERVER: 'http://localhost:8000'
  });

  const result = addPaginationDefaults('/api/v1/playbooks?status=running&name=test');

  assert.ok(result.includes('status=running'), 'Should preserve status param');
  assert.ok(result.includes('name=test'), 'Should preserve name param');
  assert.ok(result.includes('limit=3'), 'Should add default limit');
  assert.ok(result.includes('order=-started'), 'Should add default order');
});
