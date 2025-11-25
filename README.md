# Postgres Vector Store Tool (n8n)

AI agent tool for Postgres/pgvector that supports RLS-aware retrieval and custom SQL execution while relying on standard Postgres credentials.

## Features

### 🎯 AI Agent Tooling
- Dedicated Description field to explain usage to connected agents.
- Requires an embedding node connection and uses provided embeddings for similarity search.

### 🔐 RLS Retrieval Mode
- Automatically sets the provided RLS role using `SET LOCAL ROLE`.
- Customizable table and column names.
- Optional metadata inclusion in results.
- Standard Postgres credentials are used—no custom credential type required.

### 🛠️ Custom SQL Mode
- Run arbitrary SQL with full n8n expression support.
- Minimal configuration: only the SQL query field is shown.

## Installation

### Via npm (when published)
```bash
npm install n8n-nodes-postgres-vector-store-tool
```

### Manual Installation
1. Clone or download this repository.
2. Build the node:
   ```bash
   npm install
   npm run build
   ```
3. Link to your n8n installation:
   ```bash
   npm link
   cd ~/.n8n/custom
   npm link n8n-nodes-postgres-vector-store-tool
   ```

## Usage

### Connection and Credentials
- Use standard **Postgres** credentials in n8n.
- Connect an embedding node to the dedicated embedding input; the tool will use its output vector for similarity search.

### Modes

#### 1) Retrieving with RLS Role
- Provide the **RLS Role** to be set before querying.
- Set the **Table Name** and (optionally) override column names in **Options → Column Names**:
  - **ID** (default: `id`)
  - **Vector** (default: `embedding`)
  - **Content** (default: `text`)
  - **Metadata** (default: `metadata`)
- Configure **Limit** for the number of rows returned.
- Toggle **Include Metadata** to include the metadata column in the response.

#### 2) Custom SQL Query
- Only the **SQL Query** field is shown.
- The tool executes the query directly without additional processing.

## Security Considerations

- RLS roles and table/column names are validated to reduce injection risks. Ensure the specified role exists and has the correct permissions.
- Custom SQL should only be executed in trusted contexts.

## License

MIT
