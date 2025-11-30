# Release Notes

## 0.6.1
- **Output**: Removed id field from results
- **Output**: Renamed content field to text

## 0.6.0
- **BREAKING**: Removed RLS Role mode - use Custom SQL for advanced use cases
- **Refactor**: Renamed rlsHelper.ts to Helper.ts
- **Refactor**: New MyLogger class replaces createLogDebug function
- **Refactor**: Simplified node architecture, cleaner code
- **Refactor**: Added comments throughout codebase
- **UI**: Updated mode names: "Regular Retrieving" → "Vector Search"

## 0.5.47
- **UI Fix**: Embedding input now shows icon in n8n node footer (changed inputs format to object with displayName, maxConnections, required)
- Added `outputNames: ['Tool']` for proper output labeling

## 0.5.46
- **Fix**: Replaced proxy-based wrapper with direct func wrapping (`createWrappedToolFunc`) — now properly intercepts tool execution
- **Feature**: n8n Output panel now correctly shows tool input/output data
- **Debug**: Logs now use `[ToolFunc]` prefix for wrapper-related messages

## 0.5.45
- **Feature**: Critical database errors now throw `NodeOperationError` and stop workflow (table/column not found, permission denied, connection errors, etc.)
- **Feature**: Added `isCriticalError()` helper to classify errors
- **Debug**: Added detailed logging to `wrapToolForN8nOutput` wrapper with `[Wrapper]` prefix

## 0.5.44
- **Bugfix**: Fixed path to `package.json` (was `../../`, now `../../../` to account for dist folder structure)

## 0.5.43
- **Refactoring**: `NODE_VERSION` now reads from `package.json` instead of hardcoded constant
- **Refactoring**: `NODE_VERSION` moved inside class as static readonly property

## 0.5.42
- **Refactoring**: Moved `wrapToolForN8nOutput` and `createLogDebug` to helper file
- **Refactoring**: Moved `getSslConfig` and `ensureValidRole` inside class as static methods
- **Improvement**: Debug log now shows node version: `Begin... [v0.5.42]`

## 0.5.41
- **UI FIX**: Implemented proper `wrapToolForN8nOutput` Proxy wrapper (like n8n's internal `logWrapper`)
- Wrapper intercepts `_call` method on DynamicStructuredTool
- Calls `addInputData` before execution (registers input with n8n)
- Calls `addOutputData` after execution (populates Output panel)
- Proper error handling with output registration for failed executions

## 0.5.40
- **UI FIX**: Added `addOutputData` call to push execution results to n8n Output panel.
- Tool execution results are now properly displayed in the n8n UI after the AI agent calls the tool.
- Each retrieved document is shown as a separate output item in the Output panel.

## 0.5.37
- **UI Visibility**: Attempted to force UI updates by marking item status and attaching execution data.
- **Logging Fix**: Fixed `logDebug` to correctly serialize and display additional info objects in the logs.

## 0.5.36
- **Logging**: Embedded SQL query, vector preview, and result preview directly into log messages to ensure visibility in n8n logs.

## 0.5.35
- **Improvement**: Switched to Cosine distance (`<=>`) for vector similarity search, improving result quality for semantic search.
- Added detailed logging of executed SQL query and vector preview.
- Attached execution results (query, output) to the node's input item for visibility in n8n UI.

## 0.5.34
- **CRITICAL FIX**: Fixed vector format for pgvector. Now explicitly converts vector array to string format `[1,2,3]` to avoid "invalid input syntax for type vector" error.

## 0.5.33
- Enhanced error logging: now includes full error details, stack trace, and error type.
- This helps diagnose database query execution failures.

## 0.5.32
- **CRITICAL FIX**: Fixed embedding model retrieval - getInputConnectionData returns an array, now correctly extracts the first element.
- This resolves the "Embedding model is required" error when embedding node is connected.

## 0.5.31
- Enhanced embedding model diagnostics: logs full structure, type, keys, and constructor name.
- Improved error message to show what was actually received when embedding model is missing.

## 0.5.30
- Enhanced diagnostic logging: added detailed logs at key execution points for troubleshooting.
- Now logs: embedding model fetch, validation, tool creation, and return steps.

## 0.5.29
- Refactored logging: moved logDebug function to supplyData scope for better lifecycle visibility.
- Added initial "Begin..." log entry at supplyData start.

## 0.5.28
- Changed debug logging level to info for better visibility in n8n logs.

## 0.5.27
- Migrated to standard n8n logging API (this.logger.info, this.logger.debug, this.logger.error).
- Improved log formatting and consistency.

## 0.5.26
- Fixed installation issue where n8n would hang due to incorrect package entry point.

## 0.5.25
- Added "Debug Mode" option to the node settings.
- When enabled, execution logs (connection, embedding, SQL query, results) are injected into the output item under `_debug`.

## 0.4.0
- Added a default regular retrieval mode without requiring an RLS role while keeping RLS-aware and custom SQL options available.
- Enabled Include Metadata by default and clarified defaults for the new retrieval mode in the UI and docs.
- Improved embedding handling to accept the query text directly from the embedding node and surfaced the embedding node in the editor footer.

## 0.3.0
- Updated the node to use AI tool connection points for agent integrations and show the connection icon in the editor.
- Prepopulate custom column name fields with defaults so they appear immediately when selecting Column Names.
- Added this release notes file and bumped the package version.

## 0.2.0
- Initial release with RLS-aware retrieval and custom SQL execution.
