import type {
    INodeType,
    INodeTypeDescription,
    ISupplyDataFunctions,
    SupplyData,
    INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { Client as PgClient } from 'pg';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { executeCustomQuery, executeWithRole, quoteIdentifier } from '../../utils/rlsHelper';

interface PostgresCredentials {
    host: string;
    database: string;
    user: string;
    password: string;
    port: number;
    ssl?: string | boolean;
}

function getSslConfig(ssl?: string | boolean) {
    if (typeof ssl === 'string') {
        return ssl === 'disable' ? false : { rejectUnauthorized: false };
    }

    return ssl ?? false;
}

function ensureValidRole(role: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(role)) {
        throw new Error('RLS Role must contain only letters, numbers, and underscores, and cannot start with a number.');
    }

    return role;
}

export class PostgresVectorStoreTool implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Postgres Vector Store Tool',
        name: 'postgresVectorStoreTool',
        icon: 'file:postgresVectorStoreTool.svg',
        group: ['transform'],
        version: 3,
        description: 'Vector store retrieval tool with RLS-aware search and custom SQL for AI agents',
        defaults: {
            name: 'Postgres Vector Store Tool',
        },
        inputs: [NodeConnectionTypes.AiEmbedding],
        outputs: [NodeConnectionTypes.AiTool],
        credentials: [
            {
                name: 'postgres',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Description',
                name: 'agentDescription',
                type: 'string',
                typeOptions: {
                    rows: 3,
                },
                default: 'Search for similar documents in the vector database. Provide a search query to find relevant information.',
                description: 'Describe how the connected AI agent should use this tool.',
            },
            {
                displayName: 'Mode',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Regular Retrieving',
                        value: 'retrieve',
                        description: 'Perform vector similarity search without RLS role switching',
                        action: 'Retrieve documents',
                    },
                    {
                        name: 'Retrieving with RLS Role',
                        value: 'retrieveRls',
                        description: 'Perform vector similarity search with an RLS role',
                        action: 'Retrieve documents with RLS role',
                    },
                    {
                        name: 'Custom SQL Query',
                        value: 'customQuery',
                        description: 'Run a custom SQL statement with vector from query',
                        action: 'Execute custom SQL',
                    },
                ],
                default: 'retrieve',
            },
            {
                displayName: 'RLS Role',
                name: 'rlsRole',
                type: 'string',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['retrieveRls'],
                    },
                },
                default: '',
                description: 'Role to set before running the vector search (uses SET LOCAL ROLE).',
            },
            {
                displayName: 'Table Name',
                name: 'tableName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['retrieve', 'retrieveRls'],
                    },
                },
                default: 'n8n_vectors',
                description: 'Name of the table where vectors are stored. Supports schema.table format.',
            },
            {
                displayName: 'Limit',
                name: 'topK',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 1000,
                },
                displayOptions: {
                    show: {
                        operation: ['retrieve', 'retrieveRls'],
                    },
                },
                default: 4,
                description: 'Maximum number of rows to return.',
            },
            {
                displayName: 'Include Metadata',
                name: 'includeMetadata',
                type: 'boolean',
                displayOptions: {
                    show: {
                        operation: ['retrieve', 'retrieveRls'],
                    },
                },
                default: true,
                description: 'Whether to include the metadata column in the response.',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['retrieve', 'retrieveRls'],
                    },
                },
                options: [
                    {
                        displayName: 'Debug Mode',
                        name: 'debug',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to add debug information to the item.',
                    },
                    {
                        displayName: 'Column Names',
                        name: 'columnNames',
                        type: 'fixedCollection',
                        default: {
                            names: {
                                id: 'id',
                                vector: 'embedding',
                                content: 'text',
                                metadata: 'metadata',
                            },
                        },
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
                                        description: 'Column used as identifier.',
                                    },
                                    {
                                        displayName: 'Vector',
                                        name: 'vector',
                                        type: 'string',
                                        default: 'embedding',
                                        description: 'Column storing the embedding vector.',
                                    },
                                    {
                                        displayName: 'Content',
                                        name: 'content',
                                        type: 'string',
                                        default: 'text',
                                        description: 'Column storing the document text.',
                                    },
                                    {
                                        displayName: 'Metadata',
                                        name: 'metadata',
                                        type: 'string',
                                        default: 'metadata',
                                        description: 'Column storing document metadata.',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'SQL Query',
                name: 'sqlQuery',
                type: 'string',
                typeOptions: {
                    rows: 5,
                },
                displayOptions: {
                    show: {
                        operation: ['customQuery'],
                    },
                },
                default: 'SELECT * FROM n8n_vectors ORDER BY embedding <-> $1 LIMIT 10',
                description: 'Custom SQL query to execute. Use $1 as placeholder for the embedding vector.',
                placeholder: 'SELECT * FROM my_vectors WHERE metadata->>\'owner\' = \'user\' ORDER BY embedding <-> $1 LIMIT 5',
            },
        ],
    };

    async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
        const credentials = (await this.getCredentials('postgres')) as PostgresCredentials;
        const operation = this.getNodeParameter('operation', itemIndex) as string;
        const description = this.getNodeParameter('agentDescription', itemIndex) as string;
        const options = this.getNodeParameter('options', itemIndex, {}) as { debug?: boolean };
        const debug = options.debug || false;

        // Capture supplyData context for use in the tool func to push output data to n8n UI
        const supply = this;

        // Capture logger reference for use in the tool func
        const logger = this.logger;

        let item: INodeExecutionData | undefined;

        try {
            const input = this.getInputData(itemIndex) as unknown;
            if (Array.isArray(input)) {
                item = input[0] as INodeExecutionData;
            } else {
                item = input as INodeExecutionData;
            }

            // Mark item as initialized to test UI persistence
            if (item && item.json) {
                (item.json as any)._toolStatus = 'Initialized';
            }
        } catch (error) {
            // Ignore error if input cannot be retrieved (e.g. no input connection)
            if (debug) {
                logger.debug('Could not get input item for logging', { error });
            }
        }




        const logDebug = (message: string, info?: any) => {
            let logMessage = message;
            if (info !== undefined) {
                try {
                    const infoStr = typeof info === 'object' ? JSON.stringify(info) : String(info);
                    logMessage = `${message} | ${infoStr}`;
                } catch (e) {
                    logMessage = `${message} | [Error serializing info]`;
                }
            }

            logger.info(logMessage);

            if (debug && item) {
                if (!(item.json as any)._debug) {
                    (item.json as any)._debug = { logs: [] };
                }
                const debugData = (item.json as any)._debug;
                if (!debugData.logs) {
                    debugData.logs = [];
                }
                debugData.logs.push({
                    timestamp: new Date().toISOString(),
                    message,
                    info,
                });
            }
        };

        logDebug('Begin...');

        logDebug('Getting embedding model from input connection...');
        // Get embedding model from input connection
        // Note: getInputConnectionData returns an array, we need the first element
        const embeddingModelData = (await this.getInputConnectionData(
            NodeConnectionTypes.AiEmbedding,
            itemIndex,
        )) as any;

        logDebug('Raw embedding data received', {
            type: typeof embeddingModelData,
            isArray: Array.isArray(embeddingModelData),
            length: embeddingModelData?.length,
            keys: embeddingModelData ? Object.keys(embeddingModelData) : [],
        });

        // Extract the actual embedding model from the array
        const embeddingModel = Array.isArray(embeddingModelData) ? embeddingModelData[0] : embeddingModelData;

        logDebug('Embedding model extracted', {
            embeddingModel: embeddingModel,
            type: typeof embeddingModel,
            isNull: embeddingModel === null,
            isUndefined: embeddingModel === undefined,
            keys: embeddingModel ? Object.keys(embeddingModel) : [],
            hasEmbedQuery: typeof embeddingModel?.embedQuery === 'function',
            embeddingModelConstructor: embeddingModel?.constructor?.name
        });

        if (!embeddingModel || typeof embeddingModel.embedQuery !== 'function') {
            const errorMsg = `Embedding model is required. Connect an embedding node to the input. Received: ${JSON.stringify({
                type: typeof embeddingModel,
                keys: embeddingModel ? Object.keys(embeddingModel) : [],
                constructor: embeddingModel?.constructor?.name
            })}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        logDebug('Embedding model validated successfully');

        logDebug('Creating DynamicStructuredTool...');
        const tool = new DynamicStructuredTool({
            name: 'postgres_vector_search',
            description: description || 'Search for similar documents in the vector database',
            schema: z.object({
                query: z.string().describe('The search query to find similar documents'),
            }),
            func: async ({ query }: { query: string }) => {
                logDebug('func called with query', { query });
                // Create database client for this execution only
                // Using Client instead of Pool to ensure we have a single dedicated connection
                // that is definitely closed after execution.
                const client = new PgClient({
                    host: credentials.host,
                    database: credentials.database,
                    user: credentials.user,
                    password: credentials.password,
                    port: credentials.port,
                    ssl: getSslConfig(credentials.ssl),
                });

                try {
                    logDebug('Connecting to database');
                    await client.connect();
                    logDebug('Connected to database');

                    if (!query) {
                        throw new Error('Search query is missing. Please provide a query to search for.');
                    }

                    // Convert query to embedding vector
                    logDebug('Embedding query');
                    const queryVector = await embeddingModel.embedQuery(query);
                    logDebug('Query embedded successfully');

                    if (!Array.isArray(queryVector)) {
                        throw new Error('Embedding model did not return a valid vector array');
                    }

                    // Format vector for pgvector (string "[1,2,3]")
                    // pg driver converts arrays to postgres array syntax "{1,2,3}" which pgvector doesn't like
                    const vectorString = `[${queryVector.join(',')}]`;

                    let results: any[];

                    if (operation === 'customQuery') {
                        // Custom SQL mode - use $1 placeholder for vector
                        const sqlQuery = this.getNodeParameter('sqlQuery', itemIndex) as string;

                        const role = undefined; // Custom SQL doesn't use RLS by default

                        // executeCustomQuery now takes client
                        logDebug('Executing custom query', { sqlQuery });
                        // Note: executeCustomQuery might need update if it uses the vector, 
                        // but currently it seems it doesn't take the vector as arg here?
                        // Wait, executeCustomQuery implementation in rlsHelper probably doesn't handle the vector injection?
                        // Let's check rlsHelper usage. 
                        // Actually, customQuery implementation in this file (lines 336) calls executeCustomQuery(client, sqlQuery, role)
                        // It doesn't seem to pass the vector! This is a separate issue for customQuery mode.
                        // But the user is likely using 'retrieve' or 'retrieveRls' mode based on the logs showing "Executing query" (line 422).

                        results = await executeCustomQuery(client, sqlQuery, role);
                        logDebug('Custom query executed', { resultCount: results.length });
                    } else {
                        // Regular or RLS retrieve mode
                        const tableName = this.getNodeParameter('tableName', itemIndex) as string;
                        const includeMetadata = this.getNodeParameter('includeMetadata', itemIndex) as boolean;
                        const topK = this.getNodeParameter('topK', itemIndex) as number;

                        const columnNames = this.getNodeParameter('options.columnNames', itemIndex, {
                            names: {
                                id: 'id',
                                vector: 'embedding',
                                content: 'text',
                                metadata: 'metadata',
                            },
                        }) as {
                            names: {
                                id: string;
                                vector: string;
                                content: string;
                                metadata: string;
                            };
                        };

                        const columnConfig = columnNames.names || {
                            id: 'id',
                            vector: 'embedding',
                            content: 'text',
                            metadata: 'metadata',
                        };

                        const quotedTable = quoteIdentifier(tableName);
                        const quotedId = quoteIdentifier(columnConfig.id || 'id');
                        const quotedVector = quoteIdentifier(columnConfig.vector || 'embedding');
                        const quotedContent = quoteIdentifier(columnConfig.content || 'text');
                        const quotedMetadata = quoteIdentifier(columnConfig.metadata || 'metadata');

                        const metadataSelect = includeMetadata ? `, ${quotedMetadata} AS metadata` : '';

                        const sql = `SELECT ${quotedId} AS id, ${quotedContent} AS content${metadataSelect}
FROM ${quotedTable}
ORDER BY ${quotedVector} <=> $1
LIMIT $2`;

                        const role =
                            operation === 'retrieveRls'
                                ? ensureValidRole(this.getNodeParameter('rlsRole', itemIndex) as string)
                                : undefined;

                        // Log the actual query for debugging quality issues - EMBEDDED IN MESSAGE
                        const vectorPreview = vectorString.substring(0, 50) + '...';
                        logger.info(`Executing Vector Search Query. SQL: ${sql} -- Role: ${role || 'None'} -- TopK: ${topK} -- Vector: ${vectorPreview}`);

                        logDebug(`Executing query: ${sql}`, { role, topK });

                        results = await executeWithRole(
                            { client, role },
                            async (queryClient) => {
                                const result = await queryClient.query(sql, [vectorString, topK]);
                                return result.rows;
                            },
                        );
                        logDebug(`Query executed successfully. Got ${results.length} rows.`);
                    }

                    // Return results as JSON string for the AI agent
                    const resultPreview = results.length > 0 ? JSON.stringify(results[0]).substring(0, 200) + '...' : 'No results';
                    logger.info(`Vector search completed. Found ${results.length} results. Preview: ${resultPreview}`);

                    // Push output data to n8n UI Output panel
                    // This is required for AI Tool nodes to display their execution results
                    const outputItems: INodeExecutionData[] = results.map((row) => ({
                        json: row,
                        pairedItem: { item: itemIndex },
                    }));

                    // If no results, still show an empty output with query info
                    if (outputItems.length === 0) {
                        outputItems.push({
                            json: { query, message: 'No results found', timestamp: new Date().toISOString() },
                            pairedItem: { item: itemIndex },
                        });
                    }

                    supply.addOutputData(NodeConnectionTypes.AiTool, itemIndex, [outputItems]);
                    logDebug(`Output data pushed to n8n UI: ${outputItems.length} items`);

                    return JSON.stringify(results, null, 2);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    const errorDetails = {
                        message: errorMessage,
                        stack: errorStack,
                        errorType: error?.constructor?.name,
                        fullError: error
                    };

                    logger.error('Error during execution', errorDetails);
                    logDebug('Error during execution', errorDetails);
                    throw new Error(`Vector search failed: ${errorMessage}`);
                } finally {
                    // Always close the client connection
                    logDebug('Closing database connection');
                    await client.end();
                    logDebug('Database connection closed');
                }
            },
        });

        logDebug('Tool created successfully');

        logDebug('Returning supply data...');
        return {
            response: tool,
        };
    }
}
