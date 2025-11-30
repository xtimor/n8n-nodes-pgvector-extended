# Overview

This is an n8n community node package that provides an AI agent tool for PostgreSQL vector stores with pgvector support. The node enables AI agents to perform similarity searches with optional Row-Level Security (RLS) role switching and execute custom SQL queries. It integrates with n8n's AI workflow system, connecting to embedding nodes for vector similarity search operations.

The project is built as a TypeScript-based n8n node package that can be published to npm and installed in n8n instances. It provides a specialized tool for AI agents working with vector databases, particularly useful for retrieval-augmented generation (RAG) workflows.

# User Preferences

Preferred communication style: Simple, everyday language.
Git workflow: Work in branch `replit-code-generator`, user handles git push manually.
Publishing: Never publish to npm without explicit user permission.

# System Architecture

## Package Structure

**Build System**: The project uses TypeScript for compilation with a Gulp-based build pipeline. The `gulpfile.js` handles copying icon assets from the source `nodes/` directory to the compiled `dist/` output. TypeScript compiles source files according to `tsconfig.json` settings targeting ES2019 with CommonJS modules.

**Module Organization**: Source code is organized into three main directories:
- `nodes/PostgresVectorStoreTool/` - Contains the main node implementation and SVG icon
- `utils/` - Houses reusable helper functions for RLS and SQL operations  
- `scripts/` - Database setup scripts for PostgreSQL configuration

**Distribution**: Only the compiled `dist/` directory is included in the npm package. The `package.json` specifies the n8n nodes API version and points to the compiled node file.

## Node Architecture

**Connection Model**: The node uses n8n's connection system with two inputs:
- `AiTool` connection for integration with AI agent workflows
- `AiEmbedding` connection to receive vector embeddings for similarity search

**Execution Modes**: Three distinct operational modes are supported:
1. **Regular Retrieval** - Standard similarity search without RLS
2. **RLS Retrieval** - Similarity search with automatic role switching for row-level security
3. **Custom SQL** - Arbitrary SQL execution with expression support

**Credentials**: Uses standard PostgreSQL credentials (no custom credential type required). Credentials include host, database, user, password, port, and optional SSL configuration.

## Database Integration

**Connection Pooling**: Uses the `pg` (node-postgres) library with connection pooling via `PgPool`. SSL configuration is flexible, supporting disabled SSL or permissive SSL modes.

**RLS Implementation**: The `executeWithRole` helper function wraps database operations in transactions, using `SET LOCAL ROLE` to temporarily assume a specified PostgreSQL role for the duration of the transaction. Role names are validated against regex patterns to prevent SQL injection.

**Query Execution**: The `executeCustomQuery` helper supports:
- Direct SQL execution with full n8n expression interpolation
- Vector placeholder handling for embedding integration
- Schema-qualified identifier validation
- Metadata inclusion/exclusion based on configuration

**Identifier Security**: The `quoteIdentifier` function validates table/column names to prevent SQL injection, supporting both simple identifiers and schema-qualified names (e.g., `schema.table`).

## TypeScript Configuration

**Compiler Options**: Targets ES2019 with strict type checking disabled for compatibility with n8n's workflow types. Includes declaration file generation for TypeScript consumers.

**Module Resolution**: Uses Node module resolution with synthetic default imports and ESM interop enabled. Unused locals/parameters and implicit returns trigger warnings to maintain code quality.

# External Dependencies

## Core Dependencies

**pg (^8.11.0)**: PostgreSQL client library for Node.js. Handles all database connectivity, connection pooling, query execution, and transaction management. This is the only runtime dependency.

## Development Dependencies

**n8n-workflow (peer dependency)**: Provides TypeScript types and interfaces for n8n node development. Required for `IExecuteFunctions`, `INodeType`, `INodeTypeDescription`, and connection type definitions.

**TypeScript (^5.2.2)**: Compiler for TypeScript source code. Project uses ES2019 target with CommonJS module output.

**Gulp (^4.0.2)**: Task runner for build automation, specifically copying icon assets to the distribution folder.

**ESLint (^8.42.0)**: Code linting with n8n-specific rules via `eslint-plugin-n8n-nodes-base` to ensure compliance with n8n node development standards.

**Prettier (^2.7.1)**: Code formatter configured with semicolons, trailing commas, single quotes, 100-character print width, and tabs for indentation.

## Database Requirements

**PostgreSQL with pgvector**: The node requires a PostgreSQL database with the pgvector extension installed for vector similarity operations. Setup scripts are provided in the `scripts/` directory to configure the database, create necessary tables, and enable the extension.

## Integration Points

**n8n Platform**: Deployed as a community node package within n8n instances. Integrates with the AI agent system and embedding nodes through n8n's connection framework.

**Embedding Services**: Accepts vector embeddings from any n8n embedding node (OpenAI, Cohere, HuggingFace, etc.) for similarity search operations.