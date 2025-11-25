# Release Notes

## 0.5.1
- Re-release the query-forwarding and custom SQL placeholder improvements under the corrected 0.5.1 version.
- Forward the incoming query to the embedding input so similarity searches always receive the text to embed.
- Add vector placeholder handling for custom SQL queries and support schema-qualified identifiers.
- Improve validation errors when vector placeholders are missing or table identifiers are invalid.

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
