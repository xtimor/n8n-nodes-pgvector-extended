# Postgres Vector Store Tool (n8n)

AI agent tool for Postgres/pgvector with flexible vector search capabilities. Unlike the built-in Vector Store Tool, this node gives you full control over your queries through Custom SQL mode.

## Why This Tool?

The built-in n8n Vector Store Tool is limited to basic similarity search. This tool solves that by offering **Custom SQL mode** - write any query you need while still getting vector embeddings from connected embedding nodes.

## Helps With

- **Standard vector similarity search** - quick setup with configurable table/columns
- **Complex search queries** - JOINs, filters, aggregations with vector operations
- **Access control patterns** - implement row-level security, user-scoped searches
- **Multi-table retrieval** - search across related tables in one query
- **Custom ranking** - combine vector similarity with other scoring factors
- **Hybrid search** - mix full-text search with vector similarity

## Features

### Custom SQL Mode (Recommended)

Write any SQL query with `$1` placeholder for the embedding vector:

```sql
SELECT content, metadata, 1 - (embedding <=> $1) AS similarity
FROM documents
WHERE user_id = 'user123'
ORDER BY embedding <=> $1
LIMIT 10
```

### Regular Retrieval Mode

Quick setup for standard similarity search:
- Configurable table and column names
- Adjustable result limit (Top K)
- Optional metadata inclusion

### Debug Mode

Enable in Options to get detailed logging for troubleshooting:
- SQL queries being executed
- Embedding vector dimensions
- Query execution timing
- Connection details
- Error stack traces

All debug output goes to n8n logs - essential for tracing issues in production.

## Installation

### Via npm

```bash
npm install n8n-nodes-postgres-vector-store-tool
```

### Manual Installation

1. Clone or download this repository
2. Build:
   ```bash
   npm install
   npm run build
   ```
3. Link to n8n:
   ```bash
   npm link
   cd ~/.n8n/custom
   npm link n8n-nodes-postgres-vector-store-tool
   ```

## Usage

### Prerequisites

- PostgreSQL with pgvector extension
- Standard Postgres credentials in n8n
- Embedding node connected (OpenAI, Cohere, etc.)

### Quick Start

1. Add the node to your AI Agent workflow
2. Connect an embedding node to the input
3. Configure Postgres credentials
4. Choose your mode:
   - **Regular Retrieval**: Set table name, adjust options
   - **Custom SQL**: Write your query with `$1` for embeddings

### Column Configuration (Regular Mode)

Default column names (customizable in Options):
- **Vector**: `embedding`
- **Content**: `text`
- **Metadata**: `metadata`

### Output Format

Results return in `text` field for direct AI agent consumption:

```json
[
  {"text": "Document content here", "metadata": {...}},
  {"text": "Another document", "metadata": {...}}
]
```

## Testing

This node works as an AI Agent tool. To test:
1. Create a workflow with Chat Trigger → AI Agent
2. Connect this node to the Agent's tools
3. Connect an embedding node
4. Chat with the agent and ask questions that trigger vector search

Note: "Execute Step" button doesn't work for AI Tool nodes in n8n - this is a platform limitation, not a bug.

## License

MIT
