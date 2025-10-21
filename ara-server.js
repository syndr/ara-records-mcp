#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      console.log(`
Ara Records MCP Server

Usage: ara-records-mcp [options]

Options:
  --api-server <url>    ARA API server URL (default: http://localhost:8000)
  --username <user>     Username for HTTP Basic Authentication
  --password <pass>     Password for HTTP Basic Authentication
  --help, -h            Show this help message

Environment Variables (lower priority than CLI args):
  ARA_API_SERVER        Same as --api-server
  ARA_USERNAME          Same as --username
  ARA_PASSWORD          Same as --password

Examples:
  ara-records-mcp
  ara-records-mcp --api-server http://localhost:8000
  ara-records-mcp --api-server https://ara.example.com --username admin --password secret
  npx -y ara-records-mcp --api-server http://localhost:8000
`);
      process.exit(0);
    }

    if (arg === '--api-server' && i + 1 < args.length) {
      config.apiServer = args[++i];
    } else if (arg === '--username' && i + 1 < args.length) {
      config.username = args[++i];
    } else if (arg === '--password' && i + 1 < args.length) {
      config.password = args[++i];
    }
  }

  return config;
}

// Parse CLI arguments and merge with environment variables
// Priority: CLI args > environment variables > defaults
const cliArgs = parseArgs();
const ARA_API_SERVER = cliArgs.apiServer || process.env.ARA_API_SERVER || 'http://localhost:8000';
const ARA_USERNAME = cliArgs.username || process.env.ARA_USERNAME;
const ARA_PASSWORD = cliArgs.password || process.env.ARA_PASSWORD;
const API_PATH = '/api/v1';

// Helper function to create auth headers
function createAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'ara-records-mcp/1.0',
  };

  // Add basic authentication if credentials are provided
  if (ARA_USERNAME && ARA_PASSWORD) {
    const credentials = Buffer.from(`${ARA_USERNAME}:${ARA_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  return headers;
}

const server = new Server({
  name: 'ara-api',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'ara://playbooks',
        name: 'Ara Playbooks',
        description: 'List of recorded Ansible playbooks',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://plays',
        name: 'Ara Plays',
        description: 'List of recorded Ansible plays',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://tasks',
        name: 'Ara Tasks',
        description: 'List of recorded Ansible tasks',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://hosts',
        name: 'Ara Hosts',
        description: 'List of recorded Ansible hosts',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://results',
        name: 'Ara Results',
        description: 'List of recorded Ansible task results',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://latesthosts',
        name: 'Ara Latest Hosts',
        description: 'Latest playbook result for each host',
        mimeType: 'application/json',
      },
      {
        uri: 'ara://running',
        name: 'Running Playbooks',
        description: 'Currently executing Ansible playbooks (for real-time monitoring)',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read specific resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  const endpoints = {
    'ara://playbooks': `${API_PATH}/playbooks`,
    'ara://plays': `${API_PATH}/plays`,
    'ara://tasks': `${API_PATH}/tasks`,
    'ara://hosts': `${API_PATH}/hosts`,
    'ara://results': `${API_PATH}/results`,
    'ara://latesthosts': `${API_PATH}/latesthosts`,
    'ara://running': `${API_PATH}/playbooks?status=running`,
  };

  const endpoint = endpoints[uri];
  if (!endpoint) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  // Apply pagination defaults to resource endpoints too
  const paginatedEndpoint = addPaginationDefaults(endpoint);

  try {
    const response = await fetch(`${ARA_API_SERVER}${paginatedEndpoint}`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  } catch (error) {
    throw new Error(`Failed to fetch from Ara API: ${error.message}`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ara_query',
        description: 'Query Ara API endpoints with automatic pagination defaults (limit=3, order=-started)',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              description: 'API endpoint path (e.g., /api/v1/playbooks, /api/v1/plays/1). Supports query parameters like ?limit=10&offset=20&order=-started. If no limit is specified, defaults to 3 results.',
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST'],
              default: 'GET',
            },
            body: {
              type: 'object',
              description: 'Request body for POST requests',
            },
          },
          required: ['endpoint'],
        },
      },
      {
        name: 'watch_playbook',
        description: 'Monitor a playbook execution in real-time. Returns detailed progress including task completion, current status, and execution timeline. Call repeatedly to track progress.',
        inputSchema: {
          type: 'object',
          properties: {
            playbook_id: {
              type: 'number',
              description: 'The ID of the playbook to monitor',
            },
            include_tasks: {
              type: 'boolean',
              description: 'Include detailed task information (default: true)',
              default: true,
            },
            include_results: {
              type: 'boolean',
              description: 'Include task result details (default: false, can be verbose)',
              default: false,
            },
          },
          required: ['playbook_id'],
        },
      },
      {
        name: 'get_playbook_status',
        description: 'Get a quick summary of playbook execution status without detailed task information. Useful for checking if a playbook is complete or monitoring multiple playbooks.',
        inputSchema: {
          type: 'object',
          properties: {
            playbook_id: {
              type: 'number',
              description: 'The ID of the playbook to check',
            },
          },
          required: ['playbook_id'],
        },
      },
    ],
  };
});

// Helper function to add pagination defaults to endpoints
function addPaginationDefaults(endpoint) {
  const url = new URL(`${ARA_API_SERVER}${endpoint}`);

  // Add default pagination if not already present
  if (!url.searchParams.has('limit')) {
    url.searchParams.set('limit', '3');
  }

  // Add default ordering by most recent if not present
  if (!url.searchParams.has('order') &&
      (endpoint.includes('/playbooks') || endpoint.includes('/plays') ||
       endpoint.includes('/tasks') || endpoint.includes('/results'))) {
    url.searchParams.set('order', '-started');
  }

  return url.pathname + url.search;
}

// Helper function to fetch playbook details
async function fetchPlaybookDetails(playbookId, includeTasks = true, includeResults = false) {
  try {
    // Fetch playbook data
    const playbookResponse = await fetch(`${ARA_API_SERVER}${API_PATH}/playbooks/${playbookId}`, {
      headers: createAuthHeaders(),
    });

    if (!playbookResponse.ok) {
      throw new Error(`HTTP ${playbookResponse.status}: ${playbookResponse.statusText}`);
    }

    const playbook = await playbookResponse.json();

    // Calculate progress
    const totalTasks = playbook.items.tasks || 0;
    const totalResults = playbook.items.results || 0;
    const progressPercent = totalTasks > 0 ? Math.round((totalResults / totalTasks) * 100) : 0;

    const summary = {
      id: playbook.id,
      status: playbook.status,
      path: playbook.path,
      started: playbook.started,
      ended: playbook.ended,
      duration: playbook.duration,
      ansible_version: playbook.ansible_version,
      controller: playbook.controller,
      user: playbook.user,
      progress: {
        percent: progressPercent,
        tasks_total: totalTasks,
        tasks_completed: totalResults,
        plays: playbook.items.plays,
        hosts: playbook.items.hosts,
      },
      labels: playbook.labels,
    };

    // Optionally fetch task details
    if (includeTasks) {
      const tasksResponse = await fetch(
        `${ARA_API_SERVER}${API_PATH}/tasks?playbook=${playbookId}&limit=100&order=started`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        summary.tasks = tasksData.results.map(task => ({
          id: task.id,
          name: task.name,
          status: task.status,
          action: task.action,
          started: task.started,
          ended: task.ended,
          duration: task.duration,
          tags: task.tags,
        }));
        summary.tasks_count = tasksData.count;
      }
    }

    // Optionally fetch result details
    if (includeResults) {
      const resultsResponse = await fetch(
        `${ARA_API_SERVER}${API_PATH}/results?playbook=${playbookId}&limit=100&order=started`,
        {
          headers: createAuthHeaders(),
        }
      );

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        summary.results = resultsData.results.map(result => ({
          id: result.id,
          task: result.task,
          host: result.host,
          status: result.status,
          changed: result.changed,
          started: result.started,
          ended: result.ended,
          duration: result.duration,
        }));
        summary.results_count = resultsData.count;
      }
    }

    return summary;
  } catch (error) {
    throw new Error(`Failed to fetch playbook details: ${error.message}`);
  }
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'ara_query') {
    const { endpoint, method = 'GET', body } = args;

    // Apply pagination defaults to prevent token overflow
    const paginatedEndpoint = addPaginationDefaults(endpoint);

    const options = {
      method,
      headers: createAuthHeaders(),
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    try {
      const fullUrl = `${ARA_API_SERVER}${paginatedEndpoint}`;
      console.error(`[DEBUG] Fetching URL: ${fullUrl}`);
      console.error(`[DEBUG] Headers:`, JSON.stringify(options.headers, null, 2));

      const response = await fetch(fullUrl, options);

      console.error(`[DEBUG] Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} - URL: ${fullUrl}`);
      }

      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  if (name === 'watch_playbook') {
    const { playbook_id, include_tasks = true, include_results = false } = args;

    try {
      const details = await fetchPlaybookDetails(playbook_id, include_tasks, include_results);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(details, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error monitoring playbook ${playbook_id}: ${error.message}`,
          },
        ],
      };
    }
  }

  if (name === 'get_playbook_status') {
    const { playbook_id } = args;

    try {
      const details = await fetchPlaybookDetails(playbook_id, false, false);

      // Return just the summary without task details
      const status = {
        id: details.id,
        status: details.status,
        progress: details.progress,
        started: details.started,
        ended: details.ended,
        duration: details.duration,
        path: details.path,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking playbook ${playbook_id} status: ${error.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  console.error(`[STARTUP] ARA_API_SERVER: ${ARA_API_SERVER}`);
  console.error(`[STARTUP] ARA_USERNAME: ${ARA_USERNAME}`);
  console.error(`[STARTUP] ARA_PASSWORD: ${ARA_PASSWORD ? '***SET***' : '***NOT SET***'}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('*whirring* Ara MCP server activated. Testing chamber operational.');
}

// Only run the server if this file is executed directly (not required by tests)
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export functions for testing
module.exports = {
  parseArgs,
  createAuthHeaders,
  addPaginationDefaults,
};
