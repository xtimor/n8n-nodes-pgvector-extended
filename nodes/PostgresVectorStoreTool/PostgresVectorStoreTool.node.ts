import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { Pool as PgPool } from 'pg';

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
        inputs: [NodeConnectionTypes.AiTool, NodeConnectionTypes.AiEmbedding],
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
                default: '',
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
                        description: 'Run a custom SQL statement',
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
                description: 'Name of the table where vectors are stored.',
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
                default: 'SELECT * FROM n8n_vectors LIMIT 10',
                description: 'Custom SQL query to execute. Supports expressions.',
                placeholder: 'SELECT * FROM my_vectors WHERE metadata->>"owner" = "user"',
            },
            {
                displayName: 'Vector Placeholder',
                name: 'vectorPlaceholder',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['customQuery'],
                    },
                },
                default: '{{vector}}',
                description:
                    'Token in the SQL query that will be replaced with the embedding parameter placeholder (e.g. $1).',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

        const credentials = (await this.getCredentials('postgres')) as PostgresCredentials;

        const pool = new PgPool({
            host: credentials.host,
            database: credentials.database,
            user: credentials.user,
            password: credentials.password,
            port: credentials.port,
            ssl: getSslConfig(credentials.ssl),
        });

        try {
            const toolInputItems = this.getInputData(0, NodeConnectionTypes.AiTool);
            const toolQuery = (toolInputItems?.[0]?.json as { query?: string; text?: string })?.query;

            const searchQuery = toolQuery ?? (toolInputItems?.[0]?.json as { text?: string })?.text;

            const resolveEmbedding = async (): Promise<number[]> => {
                if (!searchQuery) {
                    throw new Error('A search "query" field is required from the tool input.');
                }

                const existingEmbeddingInput = this.getInputData(0, NodeConnectionTypes.AiEmbedding);

                if (existingEmbeddingInput.length === 0) {
                    this.addInputData(NodeConnectionTypes.AiEmbedding, [[{ json: { text: searchQuery, query: searchQuery } }]]);
                }

                const embeddingFromConnection = await this.getInputConnectionData(
                    NodeConnectionTypes.AiEmbedding,
                    0,
                );

                const embeddingItems = this.getInputData(0, NodeConnectionTypes.AiEmbedding);

                if ((!embeddingItems || embeddingItems.length === 0) && embeddingFromConnection === undefined) {
                    throw new Error('Embedding input is required. Connect an embedding node to provide vectors.');
                }

                const resolvedEmbedding = (() => {
                    if (Array.isArray(embeddingFromConnection)) return embeddingFromConnection;
                    if (
                        embeddingFromConnection &&
                        typeof embeddingFromConnection === 'object' &&
                        Array.isArray((embeddingFromConnection as { embedding?: number[] }).embedding)
                    ) {
                        return (embeddingFromConnection as { embedding: number[] }).embedding;
                    }

                    const itemEmbedding =
                        (embeddingItems?.[0]?.json as { embedding?: number[]; vector?: number[] })?.embedding ??
                        embeddingItems?.[0]?.json?.vector;

                    return itemEmbedding;
                })();

                if (!Array.isArray(resolvedEmbedding)) {
                    throw new Error('Embedding input must provide an array of numbers in the "embedding" field.');
                }

                return resolvedEmbedding;
            };

            if (operation === 'customQuery') {
                const sqlQuery = this.getNodeParameter('sqlQuery', 0) as string;
                const vectorPlaceholder = this.getNodeParameter('vectorPlaceholder', 0) as string;

                if (!vectorPlaceholder || vectorPlaceholder.trim() === '') {
                    throw new Error('Vector Placeholder cannot be empty when using Custom SQL.');
                }

                const placeholderRegex = new RegExp(vectorPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

                let placeholderCount = 0;
                const parametrizedSql = sqlQuery.replace(placeholderRegex, () => {
                    placeholderCount += 1;
                    return `$${placeholderCount}`;
                });

                const params =
                    placeholderCount > 0
                        ? Array(placeholderCount).fill(await resolveEmbedding())
                        : [];

                const results = await executeCustomQuery(pool, parametrizedSql, undefined, params);
                returnData.push(...results);
            } else {
                const resolvedEmbedding = await resolveEmbedding();

                const tableName = this.getNodeParameter('tableName', 0) as string;
                const includeMetadata = this.getNodeParameter('includeMetadata', 0) as boolean;
                const topK = this.getNodeParameter('topK', 0) as number;

                const columnNames = this.getNodeParameter('options.columnNames', 0, {
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
ORDER BY ${quotedVector} <-> $1
LIMIT $2`;

                const role =
                    operation === 'retrieveRls'
                        ? ensureValidRole(this.getNodeParameter('rlsRole', 0) as string)
                        : undefined;

                const rows = await executeWithRole(
                    { pool, role },
                    async (client) => {
                        const queryClient = client || pool;
                        const result = await queryClient.query(sql, [resolvedEmbedding, topK]);
                        return result.rows;
                    },
                );

                rows.forEach((row) => {
                    returnData.push({ json: row });
                });
            }
        } finally {
            await pool.end();
        }

        return [returnData];
    }
}
