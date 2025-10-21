const { test } = require('node:test');
const assert = require('node:assert');

// Load module to get exported functions
const {
  getResourcesList,
  getToolsList,
  mapResourceUriToEndpoint,
  buildResourceResponse,
} = require('../ara-server.js');

// Test getResourcesList()
test('getResourcesList - returns array of 7 resources', () => {
  const resources = getResourcesList();
  assert.strictEqual(Array.isArray(resources), true);
  assert.strictEqual(resources.length, 7);
});

test('getResourcesList - each resource has required fields', () => {
  const resources = getResourcesList();

  resources.forEach((resource, index) => {
    assert.ok(resource.uri, `Resource ${index} should have uri`);
    assert.ok(resource.name, `Resource ${index} should have name`);
    assert.ok(resource.description, `Resource ${index} should have description`);
    assert.ok(resource.mimeType, `Resource ${index} should have mimeType`);
  });
});

test('getResourcesList - all resources have mimeType application/json', () => {
  const resources = getResourcesList();

  resources.forEach((resource) => {
    assert.strictEqual(resource.mimeType, 'application/json');
  });
});

test('getResourcesList - contains all expected ara:// URIs', () => {
  const resources = getResourcesList();
  const uris = resources.map(r => r.uri);

  const expectedUris = [
    'ara://playbooks',
    'ara://plays',
    'ara://tasks',
    'ara://hosts',
    'ara://results',
    'ara://latesthosts',
    'ara://running',
  ];

  expectedUris.forEach((expectedUri) => {
    assert.ok(
      uris.includes(expectedUri),
      `Should include ${expectedUri}`
    );
  });
});

// Test getToolsList()
test('getToolsList - returns array of 3 tools', () => {
  const tools = getToolsList();
  assert.strictEqual(Array.isArray(tools), true);
  assert.strictEqual(tools.length, 3);
});

test('getToolsList - each tool has required fields', () => {
  const tools = getToolsList();

  tools.forEach((tool, index) => {
    assert.ok(tool.name, `Tool ${index} should have name`);
    assert.ok(tool.description, `Tool ${index} should have description`);
    assert.ok(tool.inputSchema, `Tool ${index} should have inputSchema`);
    assert.strictEqual(tool.inputSchema.type, 'object', `Tool ${index} inputSchema should be type object`);
  });
});

test('getToolsList - contains expected tool names', () => {
  const tools = getToolsList();
  const names = tools.map(t => t.name);

  assert.ok(names.includes('ara_query'), 'Should include ara_query tool');
  assert.ok(names.includes('watch_playbook'), 'Should include watch_playbook tool');
  assert.ok(names.includes('get_playbook_status'), 'Should include get_playbook_status tool');
});

test('getToolsList - ara_query has correct required parameters', () => {
  const tools = getToolsList();
  const araQuery = tools.find(t => t.name === 'ara_query');

  assert.ok(araQuery, 'ara_query tool should exist');
  assert.ok(araQuery.inputSchema.properties.endpoint, 'Should have endpoint property');
  assert.strictEqual(araQuery.inputSchema.required.includes('endpoint'), true, 'endpoint should be required');
});

test('getToolsList - watch_playbook has correct required parameters', () => {
  const tools = getToolsList();
  const watchPlaybook = tools.find(t => t.name === 'watch_playbook');

  assert.ok(watchPlaybook, 'watch_playbook tool should exist');
  assert.ok(watchPlaybook.inputSchema.properties.playbook_id, 'Should have playbook_id property');
  assert.strictEqual(watchPlaybook.inputSchema.required.includes('playbook_id'), true, 'playbook_id should be required');
});

test('getToolsList - get_playbook_status has correct required parameters', () => {
  const tools = getToolsList();
  const getStatus = tools.find(t => t.name === 'get_playbook_status');

  assert.ok(getStatus, 'get_playbook_status tool should exist');
  assert.ok(getStatus.inputSchema.properties.playbook_id, 'Should have playbook_id property');
  assert.strictEqual(getStatus.inputSchema.required.includes('playbook_id'), true, 'playbook_id should be required');
});

// Test mapResourceUriToEndpoint()
test('mapResourceUriToEndpoint - maps ara://playbooks to /api/v1/playbooks', () => {
  const endpoint = mapResourceUriToEndpoint('ara://playbooks');
  assert.strictEqual(endpoint, '/api/v1/playbooks');
});

test('mapResourceUriToEndpoint - maps ara://plays to /api/v1/plays', () => {
  const endpoint = mapResourceUriToEndpoint('ara://plays');
  assert.strictEqual(endpoint, '/api/v1/plays');
});

test('mapResourceUriToEndpoint - maps ara://tasks to /api/v1/tasks', () => {
  const endpoint = mapResourceUriToEndpoint('ara://tasks');
  assert.strictEqual(endpoint, '/api/v1/tasks');
});

test('mapResourceUriToEndpoint - maps ara://hosts to /api/v1/hosts', () => {
  const endpoint = mapResourceUriToEndpoint('ara://hosts');
  assert.strictEqual(endpoint, '/api/v1/hosts');
});

test('mapResourceUriToEndpoint - maps ara://results to /api/v1/results', () => {
  const endpoint = mapResourceUriToEndpoint('ara://results');
  assert.strictEqual(endpoint, '/api/v1/results');
});

test('mapResourceUriToEndpoint - maps ara://latesthosts to /api/v1/latesthosts', () => {
  const endpoint = mapResourceUriToEndpoint('ara://latesthosts');
  assert.strictEqual(endpoint, '/api/v1/latesthosts');
});

test('mapResourceUriToEndpoint - maps ara://running to /api/v1/playbooks?status=running', () => {
  const endpoint = mapResourceUriToEndpoint('ara://running');
  assert.strictEqual(endpoint, '/api/v1/playbooks?status=running');
});

test('mapResourceUriToEndpoint - throws error for unknown URI', () => {
  assert.throws(
    () => mapResourceUriToEndpoint('ara://invalid'),
    /Unknown resource/
  );
});

// Test buildResourceResponse()
test('buildResourceResponse - returns object with contents array', () => {
  const data = { test: 'data' };
  const response = buildResourceResponse('ara://playbooks', data);

  assert.ok(response.contents, 'Should have contents property');
  assert.strictEqual(Array.isArray(response.contents), true, 'contents should be an array');
  assert.strictEqual(response.contents.length, 1, 'contents should have 1 element');
});

test('buildResourceResponse - contents[0] has required fields', () => {
  const data = { test: 'data' };
  const response = buildResourceResponse('ara://playbooks', data);

  const content = response.contents[0];
  assert.strictEqual(content.uri, 'ara://playbooks', 'Should have correct URI');
  assert.strictEqual(content.mimeType, 'application/json', 'Should have correct mimeType');
  assert.ok(content.text, 'Should have text field');
});

test('buildResourceResponse - text is stringified JSON', () => {
  const data = { test: 'data', count: 42 };
  const response = buildResourceResponse('ara://playbooks', data);

  const content = response.contents[0];
  const parsed = JSON.parse(content.text);

  assert.deepStrictEqual(parsed, data, 'Parsed text should match original data');
});

test('buildResourceResponse - preserves URI in response', () => {
  const data = { test: 'data' };
  const uri = 'ara://running';
  const response = buildResourceResponse(uri, data);

  assert.strictEqual(response.contents[0].uri, uri);
});
