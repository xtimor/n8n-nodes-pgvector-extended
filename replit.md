# n8n Postgres Vector Store Tool

**Project Type:** n8n Community Node Package (TypeScript Library)  
**Last Updated:** November 30, 2025

## Overview

This is an **n8n community node package** that provides AI agent tools for PostgreSQL/pgvector integration. It's not a web application - it's a TypeScript library that gets compiled and published to npm for use within n8n workflows.

The package enables AI agents to perform:
- Vector similarity search with PostgreSQL and pgvector
- RLS (Row-Level Security) aware retrieval
- Custom SQL query execution with embedding support

## Project Structure

```
├── nodes/PostgresVectorStoreTool/    # Main n8n node implementation
│   ├── PostgresVectorStoreTool.node.ts
│   └── postgresVectorStoreTool.svg
├── utils/                            # Helper utilities for RLS and SQL
│   └── rlsHelper.ts
├── scripts/                          # Database setup scripts
│   ├── setup-postgres.sh
│   └── setup-postgres.sql
├── dist/                             # Compiled output (generated)
├── package.json                      # npm package configuration
├── tsconfig.json                     # TypeScript configuration
└── gulpfile.js                       # Build tasks (icons)
```

## Development Setup

### Technologies
- **Language:** TypeScript
- **Runtime:** Node.js v20.19.3
- **Package Manager:** npm v10.8.2
- **Build System:** TypeScript compiler + Gulp (for icon copying)

### Build Commands
- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript and copy icons to dist/
- `npm run dev` - Run TypeScript in watch mode (auto-recompile on changes)
- `npm run lint` - Lint TypeScript files
- `npm run format` - Format code with Prettier

### Current State

The project is successfully configured and building:
- ✅ All dependencies installed
- ✅ TypeScript compiles without errors
- ✅ Development workflow running in watch mode
- ✅ Build output in `dist/` folder

### Workflow Configuration

**Build & Watch** workflow is configured to run `npm run dev` which starts TypeScript in watch mode. This automatically recompiles the project when files change during development.

## How This Package Works

This is a **library package**, not a standalone application. It:
1. Exports an n8n node class (`PostgresVectorStoreTool`)
2. Gets installed into an n8n instance as a community node
3. Provides a tool interface for AI agents within n8n workflows

When published to npm, users install it via:
```bash
npm install n8n-nodes-postgres-vector-store-tool
```

Then link it to their n8n installation to use the node in their workflows.

## Key Features

- **Regular Retrieval:** Standard vector similarity search
- **RLS Retrieval:** Vector search with Row-Level Security role switching
- **Custom SQL:** Execute arbitrary SQL with embedding parameter support
- **AI Agent Integration:** Dedicated description field and tool interface for AI agents

## Dependencies

- `pg` - PostgreSQL client for Node.js
- `n8n-workflow` - n8n workflow types and utilities (peer dependency)
- TypeScript, ESLint, Prettier for development

## Notes

- This is a library package without a web server or frontend
- The "running" state means TypeScript watch mode is active
- Changes to `.ts` files automatically trigger recompilation
- The compiled output in `dist/` is what gets published to npm
