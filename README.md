# n8n-nodes-pgvector-extended

Postgres Vector Store Tool for n8n with Row Level Security (RLS) retrieval and custom SQL support.

## Features

### 🔐 Row Level Security (RLS) Retrieval
- Set PostgreSQL role before executing retrieval queries
- Support RLS policies for multi-tenant applications
- Role can be set in credentials or per-node basis
- Works with the dedicated embedding input port to search for similar content

### 🛠️ Custom SQL Queries
- Execute custom SQL queries directly
- Full n8n expression support in queries
- Return results in n8n-compatible format

### 📦 Vector Search Options
- Include or exclude metadata in results
- Override ID/vector/content/metadata column names per table
- Keep PGVector compatibility for distance calculations

## Installation

### Via npm (when published)
```bash
npm install n8n-nodes-pgvector-extended
```

### Manual Installation
1. Clone or download this repository
2. Build the node:
   ```bash
   npm install
   npm run build
   ```
3. Link to your n8n installation:
   ```bash
   npm link
   cd ~/.n8n/custom
   npm link n8n-nodes-pgvector-extended
   ```

## Usage

### Setting up RLS Role

#### In Credentials
1. Create new "Postgres Extended" credentials
2. Fill in connection details (host, database, user, password)
3. Optionally set "RLS Role" field

#### In Node Parameters
- Add "RLS Role (Override)" parameter to override credentials setting
- Leave empty to use role from credentials

### Custom SQL Query Example

```sql
SELECT * FROM n8n_vectors 
WHERE metadata->>'owner' = '{{$parameter["userId"]}}'
ORDER BY created_at DESC
LIMIT 10
```

### RLS Setup Example

```sql
-- Enable RLS on your table
ALTER TABLE n8n_vectors ENABLE ROW LEVEL SECURITY;

-- Create a policy
CREATE POLICY user_policy ON n8n_vectors
  FOR ALL
  TO app_user
  USING (metadata->>'owner' = current_setting('app.current_user'));

-- Use in n8n with RLS Role set to 'app_user'
```

## Configuration

### Credentials
- **Host**: PostgreSQL server hostname
- **Database**: Database name
- **User**: Connection username
- **Password**: Connection password
- **Port**: PostgreSQL port (default: 5432)
- **SSL**: SSL connection mode
- **RLS Role**: Optional PostgreSQL role for RLS

### Node Parameters
- **Operation**: Choose between Insert, Retrieve, or Custom Query
- **Table Name**: Vector table name (for insert/retrieve)
- **RLS Role (Override)**: Override credential role
- **SQL Query**: Custom SQL for Custom Query operation

## Security Considerations

⚠️ **RLS Role**: Ensure the role has appropriate privileges. Misconfiguration can lead to data exposure.

⚠️ **Custom SQL**: Only use in trusted workflows. Validate inputs to prevent SQL injection.

## License

MIT

## Author

Your Name (your.email@example.com)

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector Extension](https://github.com/pgvector/pgvector)
