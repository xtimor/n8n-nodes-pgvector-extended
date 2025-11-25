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
        displayName: 'PGVector Store Extended',
        name: 'vectorStorePGVectorExtended',
        icon: 'file:postgres.svg',
        group: ['transform'],
        version: 1,
        description: 'Work with PGVector with RLS support and custom SQL queries',
        defaults: {
            name: 'PGVector Extended',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'postgresExtended',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Custom SQL Query',
                        value: 'customQuery',
                        description: 'Execute a custom SQL query',
                        action: 'Execute a custom SQL query',
                    },
                    {
                        name: 'Insert Documents',
                        value: 'insert',
                        description: 'Insert documents into vector store (placeholder)',
                        action: 'Insert documents into vector store',
                    },
                    {
                        name: 'Retrieve Documents',
                        value: 'retrieve',
                        description: 'Retrieve documents from vector store (placeholder)',
                        action: 'Retrieve documents from vector store',
                    },
                ],
                default: 'customQuery',
            },
            // Table Name (shared field)
            {
                displayName: 'Table Name',
                name: 'tableName',
                type: 'string',
                default: 'n8n_vectors',
                description: 'The table name to store the vectors in',
                displayOptions: {
                    hide: {
                        operation: ['customQuery'],
                    },
                },
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
                        operation: ['customQuery'],
                    },
                },
                default: 'SELECT * FROM n8n_vectors LIMIT 10',
                description: 'Custom SQL query to execute. Supports expressions.',
                placeholder: "SELECT * FROM {{$parameter[\"tableName\"]}} WHERE metadata->>'owner' = 'user1'",
            },
            // Query for retrieve operation
            {
                displayName: 'Query',
                name: 'query',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['retrieve'],
                    },
                },
                default: '',
                description: 'The query to search for similar documents',
                required: true,
            },
            // Top K for retrieve
            {
                displayName: 'Limit',
                name: 'topK',
                type: 'number',
                displayOptions: {
                    show: {
                        operation: ['retrieve'],
                    },
                },
                default: 4,
                description: 'Number of results to return',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;

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

            if (operation === 'customQuery') {
                // Custom SQL Query operation
                const sqlQuery = this.getNodeParameter('sqlQuery', 0) as string;

                const results = await executeCustomQuery(pool, sqlQuery, rlsRole);
                returnData.push(...results);
            } else {
                // Vector store operations (insert/retrieve)
                // Note: For full vector operations, use standard PGVector Store node
                // This node focuses on RLS and Custom SQL

                if (operation === 'insert') {
                    returnData.push({
                        json: {
                            success: true,
                            operation: 'insert',
                            message: 'Insert operation: This node focuses on RLS and Custom SQL.',
                            note: 'For full vector operations with embeddings, use the standard PGVector Store node from n8n.',
                            rlsRole: rlsRole || 'none',
                        },
                    });
                } else if (operation === 'retrieve') {
                    const query = this.getNodeParameter('query', 0) as string;
                    const topK = this.getNodeParameter('topK', 0) as number;

                    returnData.push({
                        json: {
                            success: true,
                            operation: 'retrieve',
                            message: 'Retrieve operation: This node focuses on RLS and Custom SQL.',
                            query,
                            topK,
                            note: 'For full vector similarity search, use the standard PGVector Store node from n8n.',
                            rlsRole: rlsRole || 'none',
                        },
                    });
                }
            }
        } finally {
            // Always close the pool
            await pool.end();
        }

        return [returnData];
    }
}
