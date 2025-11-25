import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { Pool as PgPool } from 'pg';

import { executeCustomQuery, getRLSRole } from '../../utils/rlsHelper';

interface PostgresExtendedCredentials {
    host: string;
    database: string;
    user: string;
    password: string;
    port: number;
    ssl?: string;
    rlsRole?: string;
}

export class VectorStorePGVectorExtended implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Postgres Vector Store Tool',
        name: 'postgresVectorStoreTool',
        icon: 'file:postgres.svg',
        group: ['transform'],
        version: 1,
        description: 'Work with PGVector with RLS support and custom SQL queries',
        defaults: {
            name: 'Postgres Vector Store Tool',
        },
        inputs: ['main', 'main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'postgresExtended',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Mode',
                name: 'mode',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Retrieving with RLS Role',
                        value: 'rlsRetrieval',
                        description: 'Query the vector store using a provided embedding and optional RLS role',
                        action: 'Retrieve documents using RLS',
                    },
                    {
                        name: 'Custom SQL Query',
                        value: 'customQuery',
                        description: 'Execute a custom SQL query',
                        action: 'Execute a custom SQL query',
                    },
                ],
                default: 'rlsRetrieval',
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Description for the target agent using this tool',
                placeholder: 'Use this tool to query embeddings stored in Postgres',
                required: true,
            },
            {
                displayName: 'Table Name',
                name: 'tableName',
                type: 'string',
                default: 'n8n_vectors',
                description: 'The table name to query embeddings from',
                displayOptions: {
                    show: {
                        mode: ['rlsRetrieval'],
                    },
                },
            },
            {
                displayName: 'Include Metadata',
                name: 'includeMetadata',
                type: 'boolean',
                default: true,
                displayOptions: {
                    show: {
                        mode: ['rlsRetrieval'],
                    },
                },
                description: 'Whether to include metadata in the query results',
            },
            {
                displayName: 'Limit',
                name: 'topK',
                type: 'number',
                displayOptions: {
                    show: {
                        mode: ['rlsRetrieval'],
                    },
                },
                default: 4,
                description: 'Number of results to return',
            },
            {
                displayName: 'Column Overrides',
                name: 'columnOverrides',
                type: 'collection',
                placeholder: 'Add Column Override',
                default: {},
                options: [
                    {
                        displayName: 'ID Column',
                        name: 'idColumn',
                        type: 'string',
                        default: 'id',
                    },
                    {
                        displayName: 'Vector Column',
                        name: 'vectorColumn',
                        type: 'string',
                        default: 'embedding',
                    },
                    {
                        displayName: 'Content Column',
                        name: 'contentColumn',
                        type: 'string',
                        default: 'text',
                    },
                    {
                        displayName: 'Metadata Column',
                        name: 'metadataColumn',
                        type: 'string',
                        default: 'metadata',
                    },
                ],
                displayOptions: {
                    show: {
                        mode: ['rlsRetrieval'],
                    },
                },
                description: 'Override default column names if your schema uses different identifiers',
            },
            // RLS Role override
            {
                displayName: 'RLS Role (Override)',
                name: 'rlsRole',
                type: 'string',
                default: '',
                description: 'PostgreSQL role for Row Level Security. Overrides credential setting.',
                hint: 'Leave empty to use the role from credentials',
            },
            // Custom Query field
            {
                displayName: 'SQL Query',
                name: 'sqlQuery',
                type: 'string',
                typeOptions: {
                    rows: 5,
                },
                displayOptions: {
                    show: {
                        mode: ['customQuery'],
                    },
                },
                default: 'SELECT * FROM n8n_vectors LIMIT 10',
                description: 'Custom SQL query to execute. Supports expressions.',
                placeholder: "SELECT * FROM {{$parameter[\"tableName\"]}} WHERE metadata->>'owner' = 'user1'",
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const returnData: INodeExecutionData[] = [];
        const mode = this.getNodeParameter('mode', 0) as string;

        // Get credentials
        const credentials = (await this.getCredentials(
            'postgresExtended',
        )) as PostgresExtendedCredentials;

        // Create PostgreSQL pool
        const pool = new PgPool({
            host: credentials.host,
            database: credentials.database,
            user: credentials.user,
            password: credentials.password,
            port: credentials.port,
            ssl: credentials.ssl === 'disable' ? false : { rejectUnauthorized: false },
        });

        try {
            // Get RLS role (node parameter overrides credential)
            const rlsRole = getRLSRole(this, 0, credentials.rlsRole);

            if (mode === 'customQuery') {
                // Custom SQL Query operation
                const sqlQuery = this.getNodeParameter('sqlQuery', 0) as string;

                const results = await executeCustomQuery(pool, sqlQuery, rlsRole);
                returnData.push(...results);
            } else {
                const embeddingInput = this.getInputData(1);

                if (!embeddingInput.length) {
                    throw new Error('An embedding input connection is required for retrieval.');
                }

                const embeddingJson = embeddingInput[0].json as {
                    embedding?: number[];
                    vector?: number[];
                };

                const embedding = embeddingJson.embedding ?? embeddingJson.vector;

                if (!Array.isArray(embedding) || embedding.length === 0) {
                    throw new Error(
                        'Embedding data is missing or invalid on the embedding input connection.',
                    );
                }

                const columnOverrides = this.getNodeParameter('columnOverrides', 0, {}) as {
                    idColumn?: string;
                    vectorColumn?: string;
                    contentColumn?: string;
                    metadataColumn?: string;
                };

                const tableName = this.getNodeParameter('tableName', 0) as string;
                const includeMetadata = this.getNodeParameter('includeMetadata', 0) as boolean;
                const topK = this.getNodeParameter('topK', 0) as number;

                const idColumn = columnOverrides.idColumn || 'id';
                const vectorColumn = columnOverrides.vectorColumn || 'embedding';
                const contentColumn = columnOverrides.contentColumn || 'text';
                const metadataColumn = columnOverrides.metadataColumn || 'metadata';

                const quoteIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

                const tableIdentifier = quoteIdentifier(tableName);
                const idIdentifier = quoteIdentifier(idColumn);
                const vectorIdentifier = quoteIdentifier(vectorColumn);
                const contentIdentifier = quoteIdentifier(contentColumn);
                const metadataIdentifier = quoteIdentifier(metadataColumn);

                const metadataSelect = includeMetadata ? `, ${metadataIdentifier} AS metadata` : '';

                const rows = await executeWithRole(
                    { pool, role: rlsRole },
                    async (client) => {
                        const queryClient = client || pool;
                        const result = await queryClient.query(
                            `SELECT ${idIdentifier} AS id, ${contentIdentifier} AS content${metadataSelect}, ${vectorIdentifier} <-> $1::vector AS distance
                             FROM ${tableIdentifier}
                             ORDER BY ${vectorIdentifier} <-> $1::vector
                             LIMIT $2`,
                            [embedding, topK],
                        );
                        return result.rows;
                    },
                );

                rows.forEach((row) => {
                    returnData.push({
                        json: {
                            id: row.id,
                            content: row.content,
                            ...(includeMetadata && row.metadata ? { metadata: row.metadata } : {}),
                            distance: row.distance,
                        },
                    });
                });
            }
        } finally {
            // Always close the pool
            await pool.end();
        }

        return [returnData];
    }
}
