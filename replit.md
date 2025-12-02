# Overview

This is an n8n community node package that provides an AI agent tool for PostgreSQL vector stores with pgvector support. The node enables AI agents to perform similarity searches and execute custom SQL queries. It integrates with n8n's AI workflow system, connecting to embedding nodes for vector similarity search operations.

The project is built as a TypeScript-based n8n node package that can be published to npm and installed in n8n instances. It provides a specialized tool for AI agents working with vector databases, particularly useful for retrieval-augmented generation (RAG) workflows.

# User Preferences

Preferred communication style: Simple, everyday language.
Git workflow: Work in branch `replit-code-generator`, user handles git push manually.
Publishing: Never publish to npm without explicit user permission.

# Project Structure

```
├── nodes/PostgresVectorStoreTool/
│   ├── PostgresVectorStoreTool.node.ts   # Main node implementation
│   └── postgresVectorStoreTool.svg       # Node icon
├── utils/
│   └── Helper.ts                         # MyLogger, SQL utilities, tool wrapper
├── dist/                                 # Compiled output (npm package)
├── package.json                          # Package config
├── tsconfig.json                         # TypeScript config
├── gulpfile.js                           # Build icons task
├── README.md                             # User documentation
├── RELEASE_NOTES.md                      # Version history
└── PUBLISH_TO_NPM.md                     # Publishing guide
```

# System Architecture

## Build System

TypeScript compilation with Gulp-based build pipeline. The `gulpfile.js` handles copying icon assets from source `nodes/` directory to compiled `dist/` output.

## Node Architecture

**Connection Model**:
- Input: `AiEmbedding` connection to receive vector embeddings
- Output: `AiTool` connection for AI agent integration

**Execution Modes**:
1. **Regular Retrieval** - Standard similarity search with configurable table and columns
2. **Custom SQL** - Arbitrary SQL with $1 placeholder for embedding vector

**Credentials**: Uses standard PostgreSQL credentials (host, database, user, password, port, SSL).

## Helper Utilities (utils/Helper.ts)

- **MyLogger**: Logger wrapper with debug mode support
- **createWrappedToolFunc**: Wraps tool function for n8n input/output registration
- **quoteIdentifier**: Validates and quotes SQL identifiers
- **isCriticalError**: Detects database errors that should stop workflow

# External Dependencies

**Runtime**: pg (PostgreSQL client)
**Dev**: TypeScript, Gulp, ESLint, Prettier
**Peer**: n8n-workflow

# Known Limitations

- "Execute Step" button doesn't work for AI Tool nodes in n8n (platform limitation, not a bug)
- Must test via full workflow with AI Agent
