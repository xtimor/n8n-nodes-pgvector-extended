import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
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
        version: 1,
        description: 'Vector store retrieval tool with RLS-aware search and custom SQL for AI agents',
        defaults: {
            name: 'Postgres Vector Store Tool',
        },
        inputs: ['main', 'ai_embedding'],
        outputs: ['main'],
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
                default: 'retrieveRls',
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
                        operation: ['retrieveRls'],
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
                        operation: ['retrieveRls'],
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
                        operation: ['retrieveRls'],
                    },
                },
                default: false,
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
                        operation: ['retrieveRls'],
                    },
                },
                options: [
                    {
                        displayName: 'Column Names',
                        name: 'columnNames',
                        type: 'fixedCollection',
                        default: {},
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
            if (operation === 'customQuery') {
                const sqlQuery = this.getNodeParameter('sqlQuery', 0) as string;

                const results = await executeCustomQuery(pool, sqlQuery);
                returnData.push(...results);
            } else {
                const rlsRole = ensureValidRole(this.getNodeParameter('rlsRole', 0) as string);
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

                const embeddingItems = this.getInputData(1);
                if (!embeddingItems || embeddingItems.length === 0) {
                    throw new Error('Embedding input is required. Connect an embedding node to provide vectors.');
                }

                const embeddingVector =
                    (embeddingItems[0].json as { embedding?: number[]; vector?: number[] }).embedding ??
                    embeddingItems[0].json.vector;

                if (!Array.isArray(embeddingVector)) {
                    throw new Error('Embedding input must provide an array of numbers in the "embedding" field.');
                }

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

                const rows = await executeWithRole(
                    { pool, role: rlsRole },
                    async (client) => {
                        const queryClient = client || pool;
                        const result = await queryClient.query(sql, [embeddingVector, topK]);
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
