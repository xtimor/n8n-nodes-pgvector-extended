# Overview

This is an n8n community node package that provides an AI agent tool for PostgreSQL vector stores with pgvector support. The node enables AI agents to perform similarity searches and execute custom SQL queries. It integrates with n8n's AI workflow system, connecting to embedding nodes for vector similarity search operations.

The project is built as a TypeScript-based n8n node package that can be published to npm and installed in n8n instances. It provides a specialized tool for AI agents working with vector databases, particularly useful for retrieval-augmented generation (RAG) workflows.

# User Preferences

Preferred communication style: Simple, everyday language.
Git workflow: Work in branch `replit-code-generator`, user handles git push manually.
Publishing: Never publish to npm without explicit user permission.

# System Architecture

## Package Structure

**Build System**: The project uses TypeScript for compilation with a Gulp-based build pipeline. The `gulpfile.js` handles copying icon assets from the source `nodes/` directory to the compiled `dist/` output. TypeScript compiles source files according to `tsconfig.json` settings targeting ES2019 with CommonJS modules.

**Module Organization**: Source code is organized into two main directories:
- `nodes/PostgresVectorStoreTool/` - Contains the main node implementation and SVG icon
- `utils/` - Houses Helper.ts with MyLogger class, SQL utilities, and tool wrapper functions

**Distribution**: Only the compiled `dist/` directory is included in the npm package. The `package.json` specifies the n8n nodes API version and points to the compiled node file.

## Node Architecture

**Connection Model**: The node uses n8n's connection system:
- Input: `AiEmbedding` connection to receive vector embeddings for similarity search
- Output: `AiTool` connection for integration with AI agent workflows

**Execution Modes**: Two operational modes are supported:
1. **Vector Search** - Standard similarity search with configurable table and columns
2. **Custom SQL** - Arbitrary SQL execution with $1 placeholder for embedding vector

**Credentials**: Uses standard PostgreSQL credentials (no custom credential type required). Credentials include host, database, user, password, port, and optional SSL configuration.

## Helper Utilities (utils/Helper.ts)

**MyLogger**: Custom logger wrapper class with debug mode support. Logs debug messages only when debug mode is enabled, always logs info/error messages.

**createWrappedToolFunc**: Wraps tool function to handle n8n input/output registration for UI display. Must wrap func BEFORE creating DynamicStructuredTool.

**quoteIdentifier**: Validates and quotes SQL identifiers to prevent injection. Supports schema.table format.

**isCriticalError**: Detects database errors that should stop workflow execution (connection errors, permission denied, table not found, etc.)

## TypeScript Configuration

**Compiler Options**: Targets ES2019 with strict type checking disabled for compatibility with n8n's workflow types. Includes declaration file generation for TypeScript consumers.

**Module Resolution**: Uses Node module resolution with synthetic default imports and ESM interop enabled.

# External Dependencies

## Core Dependencies

**pg (^8.11.0)**: PostgreSQL client library for Node.js. Handles all database connectivity and query execution. This is the only runtime dependency.

## Development Dependencies

**n8n-workflow (peer dependency)**: Provides TypeScript types and interfaces for n8n node development.

**TypeScript (^5.2.2)**: Compiler for TypeScript source code.

**Gulp (^4.0.2)**: Task runner for build automation, specifically copying icon assets.

**ESLint (^8.42.0)**: Code linting with n8n-specific rules.

**Prettier (^2.7.1)**: Code formatter.

## Database Requirements

**PostgreSQL with pgvector**: The node requires a PostgreSQL database with the pgvector extension installed for vector similarity operations.

## Integration Points

**n8n Platform**: Deployed as a community node package within n8n instances. Integrates with the AI agent system and embedding nodes through n8n's connection framework.

**Embedding Services**: Accepts vector embeddings from any n8n embedding node (OpenAI, Cohere, HuggingFace, Google, etc.) for similarity search operations.
