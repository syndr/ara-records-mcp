# Ara Records MCP Server

A custom Model Context Protocol (MCP) server for integrating with the Ara Records API, enabling Ansible playbook execution monitoring through Claude Code.

## Overview

This MCP server provides programmatic access to Ara Records (Ansible Run Analysis) API endpoints, allowing Claude Code to query and analyze Ansible playbook execution data.

## Setup

### Prerequisites

- Node.js >= 18.0.0
- Ara API running locally (default: `http://localhost:8000`)

### Installation

#### Install via npx (Recommended)

The easiest way to install is using `claude mcp add` with npx:

```bash
# Local installation (project-specific, default)
claude mcp add ara-api -- npx -y @ultroncore/ara-records-mcp

# User installation (available globally for your user)
claude mcp add --scope user ara-api -- npx -y @ultroncore/ara-records-mcp
```

With custom ARA server:

```bash
claude mcp add --scope user ara-api -- npx -y @ultroncore/ara-records-mcp --api-server http://ara.example.com:8080
```

With authentication:

```bash
claude mcp add --scope user ara-api -- npx -y @ultroncore/ara-records-mcp --api-server https://ara.example.com --username admin --password secret
```

**Scope options:**
- `local` (default): Project-specific installation
- `user`: Available globally for your user account
- `project`: Project-specific (same as local)

You can also run it directly without installation:

```bash
npx @ultroncore/ara-records-mcp --help
```

#### Install Globally via npm

For global installation (allows running `ara-records-mcp` from anywhere):

```bash
npm install -g @ultroncore/ara-records-mcp
```

Then run directly:

```bash
ara-records-mcp --help
ara-records-mcp --api-server http://localhost:8000
```

#### Install from GitHub

Install directly from the GitHub repository:

```bash
npm install git+https://github.com/syndr/ara-records-mcp.git
```

This will automatically:
- Clone the repository
- Install the `@modelcontextprotocol/sdk` dependency
- Make the MCP server ready to use

#### Install from Local Clone

If you've cloned the repository locally:

```bash
# Quick setup (recommended)
./setup.sh

# Manual setup
npm install
```

The setup script will:
- Verify Node.js >= 18.0.0 is installed
- Install `@modelcontextprotocol/sdk` and dependencies
- Validate the installation was successful

#### Common Setup Scenarios

- Initial repository clone
- Merging feature branches
- Switching between worktrees
- After running `git clean -fdx`

## Features

### Resources (Read-Only Access)

The server exposes the following resources via the `ara://` URI scheme:

- `ara://playbooks` - List of recorded Ansible playbooks
- `ara://plays` - List of recorded Ansible plays
- `ara://tasks` - List of recorded Ansible tasks
- `ara://hosts` - List of recorded Ansible hosts
- `ara://results` - List of recorded task results
- `ara://latesthosts` - Latest playbook result for each host
- `ara://running` - Currently executing Ansible playbooks (for real-time monitoring)

### Tools

- **ara_query** - Query arbitrary Ara API endpoints with GET/POST support and automatic pagination
- **watch_playbook** - Monitor a specific playbook execution with detailed progress tracking, task completion status, and execution timeline
- **get_playbook_status** - Get a quick summary of playbook execution status without detailed task information

## Technical Details

### Project Structure

```
ara-records-mcp/
├── ara-server.js    # Main MCP server implementation
├── package.json     # Node.js dependencies
├── package-lock.json # Locked dependency versions
├── setup.sh         # Automated setup script
├── .gitignore       # Git ignore rules
└── README.md        # This documentation
```

### Configuration

Configure the server in your Claude Code `.mcp.json` file:

#### After Installing from GitHub

```json
{
  "mcpServers": {
    "ara-api": {
      "command": "node",
      "args": ["node_modules/ara-records-mcp/ara-server.js"],
      "env": {
        "ARA_API_SERVER": "http://localhost:8000"
      }
    }
  }
}
```

#### After Local Clone/Development

```json
{
  "mcpServers": {
    "ara-api": {
      "command": "node",
      "args": ["ara-server.js"],
      "env": {
        "ARA_API_SERVER": "http://localhost:8000"
      }
    }
  }
}
```

#### Environment Variables and CLI Arguments

Configuration can be provided via environment variables or CLI arguments. CLI arguments take precedence over environment variables.

| CLI Argument | Environment Variable | Description | Default | Required |
|--------------|---------------------|-------------|---------|----------|
| `--api-server <url>` | `ARA_API_SERVER` | Base URL of the Ara API server | `http://localhost:8000` | No |
| `--username <user>` | `ARA_USERNAME` | Username for HTTP Basic Authentication | None | No |
| `--password <pass>` | `ARA_PASSWORD` | Password for HTTP Basic Authentication | None | No |

**Priority**: CLI arguments > Environment variables > Defaults

#### Authentication Support

The server currently supports **HTTP Basic Authentication** for scenarios where the Ara API is behind a reverse proxy (nginx, Apache, etc.) that implements authentication.

Additional authentication methods (API tokens, OAuth, etc.) may be added in future releases.

**Example with Basic Auth (Environment Variables)**:

```json
{
  "mcpServers": {
    "ara-api": {
      "command": "node",
      "args": ["node_modules/ara-records-mcp/ara-server.js"],
      "env": {
        "ARA_API_SERVER": "https://ara.example.com",
        "ARA_USERNAME": "your-username",
        "ARA_PASSWORD": "your-password"
      }
    }
  }
}
```

**Example with Basic Auth (CLI Arguments via npx)**:

```bash
claude mcp add ara-api -- npx -y @ultroncore/ara-records-mcp --api-server https://ara.example.com --username your-username --password your-password
```

**Note**: Both `ARA_USERNAME` and `ARA_PASSWORD` (or `--username` and `--password`) must be set for authentication to be enabled. If only one is provided, no authentication will be used.

### API Endpoints

The server connects to Ara's REST API v1 endpoints:
- Base URL: `http://localhost:8000` (configurable via `ARA_API_SERVER` environment variable or `--api-server` CLI argument)
- API Path: `/api/v1` (hardcoded for consistency)
- Full endpoints: `/api/v1/playbooks`, `/api/v1/plays`, etc.

### Automatic Pagination

All requests include automatic pagination to prevent token overflow:

- **Default Limit**: 10 results per request (if not specified)
- **Smart Ordering**: Automatically applies `order=-started` to chronological endpoints (playbooks, plays, tasks, results)
- **Token Efficiency**: Prevents MCP tool responses from exceeding token limits
- **Backward Compatibility**: Respects explicit query parameters when provided

## Requirements

- Ara API must be running and accessible (default: `http://localhost:8000`)
- Claude Code restart required after installation to load the MCP server
- Supports GET/POST operations only

## Testing the Implementation

### Verify Ara API is Running

```bash
curl -s http://localhost:8000/api/v1/ | jq
```

### Test MCP Server Startup

```bash
timeout 2 node ara-server.js 2>&1
```

Expected output: `*whirring* Ara MCP server activated. Testing chamber operational.`

### Verification Steps

1. **Ara API Check**: Ensure Ara is running and responding at `http://localhost:8000/api/v1/`
2. **MCP Server Test**: Run the server directly to confirm no startup errors
3. **Claude Code Integration**: Restart Claude Code and verify MCP resources are available
4. **Resource Access**: Test accessing `ara://playbooks` and other resources

## Usage Examples

### Default Query with Automatic Pagination

```javascript
mcp__ara-api__ara_query({ endpoint: "/api/v1/playbooks" })
// Automatically applies: limit=10&order=-started
```

### Explicit Pagination

```javascript
mcp__ara-api__ara_query({ endpoint: "/api/v1/playbooks?limit=10&offset=20" })
// Respects user-provided parameters
```

### Specific Resource Lookup

```javascript
mcp__ara-api__ara_query({ endpoint: "/api/v1/playbooks/2273" })
// No pagination applied for specific resource IDs
```

### Real-Time Playbook Monitoring

Monitor a playbook execution as it runs:

```javascript
// Get detailed progress with task information
mcp__ara-api__watch_playbook({
  playbook_id: 2510,
  include_tasks: true,
  include_results: false
})

// Returns:
// - Execution status (running, completed, failed)
// - Progress percentage (tasks completed / total tasks)
// - Task list with status, timing, and action details
// - Host and play counts
```

### Quick Status Check

Check playbook status without verbose task details:

```javascript
mcp__ara-api__get_playbook_status({ playbook_id: 2510 })

// Returns:
// - Current status
// - Progress percentage
// - Start/end times and duration
// - Playbook path
```

### Monitor Running Playbooks

List all currently executing playbooks:

```javascript
// Using resource
ReadMcpResourceTool({ server: "ara-api", uri: "ara://running" })

// Or using ara_query
mcp__ara-api__ara_query({ endpoint: "/api/v1/playbooks?status=running" })
```

## Implementation Notes

### Architecture

- Uses schema-based request handlers (`ListResourcesRequestSchema`, `ReadResourceRequestSchema`, `CallToolRequestSchema`)
- Implements MCP SDK v1.0.0+ standards
- Provides both resource exposure and tool functionality for comprehensive API access
- Automatic pagination and ordering to prevent token overflow in large result sets

### Real-Time Monitoring

While Ara doesn't natively support WebSockets, the MCP server provides polling-based monitoring that Claude can use to watch playbook execution:

- **Polling Pattern**: Tools return current state that can be called repeatedly
- **Progress Tracking**: Calculates completion percentage based on tasks completed vs total tasks
- **Resource Filtering**: The `ara://running` resource filters for in-progress playbooks only
- **Structured Data**: Returns normalized JSON with status, timing, and progress information

**How to Use for Monitoring:**

1. Get list of running playbooks from `ara://running` resource
2. Use `get_playbook_status()` tool to check progress periodically
3. Use `watch_playbook()` tool for detailed task-level monitoring
4. Call tools repeatedly (every few seconds) to track execution progress

### Error Handling

The server implements basic error handling for:
- Invalid resource URIs
- HTTP errors from Ara API
- Network connectivity issues
- Missing or invalid playbook IDs

## Future Enhancements

- [x] **Basic Authentication**: HTTP Basic Auth support via environment variables (completed)
- [ ] **Additional Authentication Methods**: Support for API tokens, OAuth, JWT, or other auth mechanisms
- [x] **Pagination**: Implement proper pagination handling for large result sets (completed)
- [ ] **Advanced Filtering**: Add more sophisticated query parameter support for resource endpoints
- [ ] **Enhanced Error Handling**: Improve error messages and recovery strategies
- [x] **Real-Time Monitoring**: Polling-based playbook execution monitoring with progress tracking (completed - note: WebSocket not supported by Ara API, implemented polling-based solution instead)
- [ ] **Automated Deployment**: Ansible playbook for updating and deploying the MCP server

## Version History

### v1.0.0 (2025-10-20) - Initial Release

- **Basic Authentication Support**: HTTP Basic Authentication for reverse proxy scenarios
  - Environment variables `ARA_USERNAME` and `ARA_PASSWORD` for credentials
  - Automatic Authorization header generation with base64 encoding
  - Future-ready for additional authentication methods
- **Real-Time Monitoring**: Polling-based playbook execution monitoring
  - New `ara://running` resource for listing active playbooks
  - `watch_playbook` tool for detailed progress tracking with task information
  - `get_playbook_status` tool for quick status checks
  - Progress calculation (percentage, task counts, timing information)
- **Pagination Support**: Automatic pagination with configurable limits and smart ordering
- **MCP SDK Integration**: Schema-based request handlers using MCP SDK v1.0.0+
- **Token Optimization**: Safeguards to prevent token overflow in responses
- **GitHub Installation**: Proper package.json metadata for direct git installation

## License

MIT

## Support

For issues or questions, please refer to the main project documentation or submit an issue to the repository.
