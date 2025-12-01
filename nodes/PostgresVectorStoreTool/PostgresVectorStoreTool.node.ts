import type {
        INodeType,
        INodeTypeDescription,
        ISupplyDataFunctions,
        SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { Client as PgClient } from 'pg';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { MyLogger, quoteIdentifier, createWrappedToolFunc } from '../../utils/Helper';

// PostgreSQL credentials interface
interface PostgresCredentials {
        host: string;
        database: string;
        user: string;
        password: string;
        port: number;
        ssl?: string | boolean;
}

// Column configuration for vector table
interface ColumnConfig {
        id: string;
        vector: string;
        content: string;
        metadata: string;
}

// Load package version at module level
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../../package.json');

export class PostgresVectorStoreTool implements INodeType {
        // Package version for logging
        private static readonly NODE_VERSION: string = packageJson.version;

        // Default column names for vector table
        private static readonly DEFAULT_COLUMNS: ColumnConfig = {
                id: 'id',
                vector: 'embedding',
                content: 'text',
                metadata: 'metadata',
        };

        /**
         * Parse SSL configuration from credentials
         */
        private static getSslConfig(ssl?: string | boolean): boolean | { rejectUnauthorized: boolean } {
                if (typeof ssl === 'string') {
                        return ssl === 'disable' ? false : { rejectUnauthorized: false };
                }
                return ssl ?? false;
        }

        description: INodeTypeDescription = {
                displayName: 'Postgres Vector Store Tool',
                name: 'postgresVectorStoreTool',
                icon: 'file:postgresVectorStoreTool.svg',
                group: ['transform'],
                version: 3,
                description: 'Vector similarity search tool for AI agents with pgvector support',
                defaults: {
                        name: 'Postgres Vector Store Tool',
                },
                inputs: [
                        {
                                displayName: 'Embedding',
                                maxConnections: 1,
                                type: NodeConnectionTypes.AiEmbedding,
                                required: true,
                        },
                ],
                outputs: [NodeConnectionTypes.AiTool],
                outputNames: ['Tool'],
                credentials: [
                        {
                                name: 'postgres',
                                required: true,
                        },
                ],
                properties: [
                        // Tool description for AI agent
                        {
                                displayName: 'Description',
                                name: 'agentDescription',
                                type: 'string',
                                typeOptions: { rows: 3 },
                                default:
                                        'Search for similar documents in the vector database. Provide a search query to find relevant information.',
                                description: 'Describe how the AI agent should use this tool',
                        },
                        // Operation mode selector
                        {
                                displayName: 'Mode',
                                name: 'operation',
                                type: 'options',
                                noDataExpression: true,
                                options: [
                                        {
                                                name: 'Vector Search',
                                                value: 'retrieve',
                                                description: 'Perform vector similarity search',
                                                action: 'Search similar documents',
                                        },
                                        {
                                                name: 'Custom SQL',
                                                value: 'customQuery',
                                                description: 'Execute custom SQL with vector parameter',
                                                action: 'Execute custom SQL',
                                        },
                                ],
                                default: 'retrieve',
                        },
                        // Vector search settings
                        {
                                displayName: 'Table Name',
                                name: 'tableName',
                                type: 'string',
                                displayOptions: { show: { operation: ['retrieve'] } },
                                default: 'n8n_vectors',
                                description: 'Table containing vectors (supports schema.table format)',
                        },
                        {
                                displayName: 'Limit',
                                name: 'topK',
                                type: 'number',
                                typeOptions: { minValue: 1, maxValue: 1000 },
                                displayOptions: { show: { operation: ['retrieve'] } },
                                default: 4,
                                description: 'Maximum results to return',
                        },
                        {
                                displayName: 'Include Metadata',
                                name: 'includeMetadata',
                                type: 'boolean',
                                displayOptions: { show: { operation: ['retrieve'] } },
                                default: true,
                                description: 'Whether to include metadata column in results',
                        },
                        // Advanced options
                        {
                                displayName: 'Options',
                                name: 'options',
                                type: 'collection',
                                placeholder: 'Add Option',
                                default: {},
                                displayOptions: { show: { operation: ['retrieve'] } },
                                options: [
                                        {
                                                displayName: 'Debug Mode',
                                                name: 'debug',
                                                type: 'boolean',
                                                default: false,
                                                description: 'Whether to enable detailed logging for troubleshooting',
                                        },
                                        {
                                                displayName: 'Column Names',
                                                name: 'columnNames',
                                                type: 'fixedCollection',
                                                default: { names: { id: 'id', vector: 'embedding', content: 'text', metadata: 'metadata' } },
                                                placeholder: 'Custom column names',
                                                options: [
                                                        {
                                                                displayName: 'Names',
                                                                name: 'names',
                                                                values: [
                                                                        {
                                                                                displayName: 'ID',
                                                                                name: 'id',
                                                                                type: 'string',
                                                                                default: 'id',
                                                                                description: 'Primary key column',
                                                                        },
                                                                        {
                                                                                displayName: 'Vector',
                                                                                name: 'vector',
                                                                                type: 'string',
                                                                                default: 'embedding',
                                                                                description: 'Vector embedding column',
                                                                        },
                                                                        {
                                                                                displayName: 'Content',
                                                                                name: 'content',
                                                                                type: 'string',
                                                                                default: 'text',
                                                                                description: 'Document text column',
                                                                        },
                                                                        {
                                                                                displayName: 'Metadata',
                                                                                name: 'metadata',
                                                                                type: 'string',
                                                                                default: 'metadata',
                                                                                description: 'JSON metadata column',
                                                                        },
                                                                ],
                                                        },
                                                ],
                                        },
                                ],
                        },
                        // Custom SQL query
                        {
                                displayName: 'SQL Query',
                                name: 'sqlQuery',
                                type: 'string',
                                typeOptions: { rows: 5 },
                                displayOptions: { show: { operation: ['customQuery'] } },
                                default: 'SELECT * FROM n8n_vectors ORDER BY embedding <=> $1 LIMIT 10',
                                description: 'SQL query with $1 placeholder for embedding vector',
                                placeholder:
                                        "SELECT * FROM vectors WHERE metadata->>'type' = 'doc' ORDER BY embedding <=> $1 LIMIT 5",
                        },
                        // Debug mode for custom SQL
                        {
                                displayName: 'Options',
                                name: 'customOptions',
                                type: 'collection',
                                placeholder: 'Add Option',
                                default: {},
                                displayOptions: { show: { operation: ['customQuery'] } },
                                options: [
                                        {
                                                displayName: 'Debug Mode',
                                                name: 'debug',
                                                type: 'boolean',
                                                default: false,
                                                description: 'Whether to enable detailed logging for troubleshooting',
                                        },
                                ],
                        },
                ],
        };

        async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
                // Get credentials and parameters
                const credentials = (await this.getCredentials('postgres')) as PostgresCredentials;
                const operation = this.getNodeParameter('operation', itemIndex) as string;
                const description = this.getNodeParameter('agentDescription', itemIndex) as string;

                // Get debug mode from appropriate options
                const options =
                        operation === 'customQuery'
                                ? (this.getNodeParameter('customOptions', itemIndex, {}) as { debug?: boolean })
                                : (this.getNodeParameter('options', itemIndex, {}) as { debug?: boolean });
                const debug = options.debug || false;

                // Initialize logger
                const logger = new MyLogger(this.logger, debug);
                logger.debug(`Starting node v${PostgresVectorStoreTool.NODE_VERSION}`);

                // Get embedding model from connected node
                logger.debug('Fetching embedding model');
                const embeddingData = (await this.getInputConnectionData(
                        NodeConnectionTypes.AiEmbedding,
                        itemIndex,
                )) as any;

                // Extract model (may be wrapped in array)
                const embeddingModel = Array.isArray(embeddingData) ? embeddingData[0] : embeddingData;

                logger.debug('Embedding model received', {
                        type: typeof embeddingModel,
                        hasEmbedQuery: typeof embeddingModel?.embedQuery === 'function',
                });

                // Validate embedding model
                if (!embeddingModel || typeof embeddingModel.embedQuery !== 'function') {
                        throw new Error('Embedding model required. Connect an embedding node to the input.');
                }

                // Store context reference for use in tool function
                const context = this;

                // Tool execution function
                const toolFunc = async ({ query }: { query: string }): Promise<string> => {
                        logger.debug('Tool called', { query });

                        // Create database client
                        const client = new PgClient({
                                host: credentials.host,
                                database: credentials.database,
                                user: credentials.user,
                                password: credentials.password,
                                port: credentials.port,
                                ssl: PostgresVectorStoreTool.getSslConfig(credentials.ssl),
                        });

                        try {
                                // Connect to database
                                logger.debug('Connecting to database');
                                await client.connect();

                                // Validate query
                                if (!query?.trim()) {
                                        throw new Error('Search query is required');
                                }

                                // Generate embedding vector
                                logger.debug('Generating embedding');
                                const vector = await embeddingModel.embedQuery(query);

                                if (!Array.isArray(vector)) {
                                        throw new Error('Embedding model returned invalid vector');
                                }

                                // Format vector for pgvector
                                const vectorStr = `[${vector.join(',')}]`;
                                logger.debug('Embedding generated', { dimensions: vector.length });

                                let results: any[];

                                if (operation === 'customQuery') {
                                        // Custom SQL mode
                                        const sql = context.getNodeParameter('sqlQuery', itemIndex) as string;
                                        logger.debug('Executing custom SQL', { sql });

                                        const result = await client.query(sql, [vectorStr]);
                                        results = result.rows;
                                } else {
                                        // Vector search mode
                                        const tableName = context.getNodeParameter('tableName', itemIndex) as string;
                                        const topK = context.getNodeParameter('topK', itemIndex) as number;
                                        const includeMetadata = context.getNodeParameter('includeMetadata', itemIndex) as boolean;

                                        // Get column configuration
                                        const columnNames = context.getNodeParameter('options.columnNames', itemIndex, {
                                                names: PostgresVectorStoreTool.DEFAULT_COLUMNS,
                                        }) as { names: ColumnConfig };
                                        const cols = columnNames.names || PostgresVectorStoreTool.DEFAULT_COLUMNS;

                                        // Build SQL query - return text field only (no id)
                                        const metadataCol = includeMetadata ? `, ${quoteIdentifier(cols.metadata)} AS metadata` : '';
                                        const sql = `
                                                SELECT ${quoteIdentifier(cols.content)} AS text${metadataCol}
                                                FROM ${quoteIdentifier(tableName)}
                                                ORDER BY ${quoteIdentifier(cols.vector)} <=> $1
                                                LIMIT $2
                                        `;

                                        logger.debug('Executing search', { table: tableName, topK });
                                        const result = await client.query(sql, [vectorStr, topK]);
                                        results = result.rows;
                                }

                                logger.debug('Query completed', { resultCount: results.length });
                                return JSON.stringify(results, null, 2);
                        } catch (error) {
                                const message = error instanceof Error ? error.message : String(error);
                                logger.error('Execution failed', { error: message });
                                throw new Error(`Vector search failed: ${message}`);
                        } finally {
                                logger.debug('Closing connection');
                                await client.end();
                        }
                };

                // Wrap function for n8n UI integration
                const wrappedFunc = createWrappedToolFunc(toolFunc, {
                        context: this,
                        itemIndex,
                        logger,
                });

                // Create LangChain tool
                logger.debug('Creating tool');
                const tool = new DynamicStructuredTool({
                        name: 'postgres_vector_search',
                        description: description || 'Search for similar documents in the vector database',
                        schema: z.object({
                                query: z.string().describe('The search query to find similar documents'),
                        }),
                        func: wrappedFunc,
                });

                logger.debug('Tool ready');
                return { response: tool };
        }
}
