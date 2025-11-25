import {
    PGVectorStore,
    type DistanceStrategy,
    type PGVectorStoreArgs,
} from '@langchain/community/vectorstores/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import type { Pool } from 'pg';
import { Pool as PgPool } from 'pg';

import { executeCustomQuery, executeWithRole, getRLSRole } from '../../utils/rlsHelper';

interface PostgresExtendedCredentials {
    host: string;
    database: string;
    user: string;
    password: string;
    port: number;
    ssl?: string;
    rlsRole?: string;
}

interface CollectionOptions {
    useCollection?: boolean;
    collectionName?: string;
    collectionTableName?: string;
}

interface ColumnOptions {
    idColumnName: string;
    vectorColumnName: string;
    contentColumnName: string;
    metadataColumnName: string;
}

/**
 * Extended PGVectorStore class to handle RLS and custom filtering
 */
class ExtendedPGVectorStore extends PGVectorStore {
    rlsRole?: string;

    constructor(embeddings: EmbeddingsInterface, config: PGVectorStoreArgs & { rlsRole?: string }) {
        const { rlsRole, ...pgVectorConfig } = config;
        super(embeddings, pgVectorConfig);
        this.rlsRole = rlsRole;
    }

    static async initialize(
        embeddings: EmbeddingsInterface,
        args: PGVectorStoreArgs & { dimensions?: number; rlsRole?: string },
    ): Promise<ExtendedPGVectorStore> {
        const { dimensions, rlsRole, ...rest } = args;
        const pool = rest.pool as Pool;

        // Execute initialization with RLS role if specified
        const executionContext = { pool, role: rlsRole };

        await executeWithRole(executionContext, async (client) => {
            const postgresqlVectorStore = new this(embeddings, { ...rest, rlsRole });
            await postgresqlVectorStore._initializeClient();

            const initClient = client || pool;
            // Ensure table exists
            await postgresqlVectorStore.ensureTableInDatabase(dimensions);

            if (postgresqlVectorStore.collectionTableName) {
                await postgresqlVectorStore.ensureCollectionTableInDatabase();
            }

            return postgresqlVectorStore;
        });

        return new this(embeddings, { ...rest, rlsRole });
    }

    async similaritySearchVectorWithScore(
        query: number[],
        k: number,
        filter?: PGVectorStore['FilterType'],
    ) {
        const mergedFilter = { ...this.filter, ...filter };

        // If RLS role is set, execute with role switching
        if (this.rlsRole && this.pool) {
            const executionContext = { pool: this.pool as Pool, role: this.rlsRole };
            return await executeWithRole(executionContext, async () => {
                return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
            });
        }

        return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
    }

    async addDocuments(documents: any[]) {
        // If RLS role is set, execute with role switching
        if (this.rlsRole && this.pool) {
            const executionContext = { pool: this.pool as Pool, role: this.rlsRole };
            return await executeWithRole(executionContext, async () => {
                return await super.addDocuments(documents);
            });
        }

        return await super.addDocuments(documents);
    }
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
                        name: 'Insert Documents',
                        value: 'insert',
                        description: 'Insert documents into vector store',
                        action: 'Insert documents into vector store',
                    },
                    {
                        name: 'Retrieve Documents',
                        value: 'retrieve',
                        description: 'Retrieve documents from vector store',
                        action: 'Retrieve documents from vector store',
                    },
                    {
                        name: 'Custom SQL Query',
                        value: 'customQuery',
                        description: 'Execute a custom SQL query',
                        action: 'Execute a custom SQL query',
                    },
                ],
                default: 'insert',
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
                placeholder: 'SELECT * FROM {{$parameter["tableName"]}} WHERE metadata->>\'owner\' = \'user1\'',
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
            // Options
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    hide: {
                        operation: ['customQuery'],
                    },
                },
                options: [
                    {
                        displayName: 'Distance Strategy',
                        name: 'distanceStrategy',
                        type: 'options',
                        default: 'cosine',
                        description: 'The method to calculate distance between vectors',
                        options: [
                            {
                                name: 'Cosine',
                                value: 'cosine',
                            },
                            {
                                name: 'Inner Product',
                                value: 'innerProduct',
                            },
                            {
                                name: 'Euclidean',
                                value: 'euclidean',
                            },
                        ],
                    },
                    {
                        displayName: 'Column Names',
                        name: 'columnNames',
                        type: 'fixedCollection',
                        default: {},
                        typeOptions: {
                            multipleValues: false,
                        },
                        options: [
                            {
                                name: 'values',
                                displayName: 'Column Name Settings',
                                values: [
                                    {
                                        displayName: 'ID Column Name',
                                        name: 'idColumnName',
                                        type: 'string',
                                        default: 'id',
                                    },
                                    {
                                        displayName: 'Vector Column Name',
                                        name: 'vectorColumnName',
                                        type: 'string',
                                        default: 'embedding',
                                    },
                                    {
                                        displayName: 'Content Column Name',
                                        name: 'contentColumnName',
                                        type: 'string',
                                        default: 'text',
                                    },
                                    {
                                        displayName: 'Metadata Column Name',
                                        name: 'metadataColumnName',
                                        type: 'string',
                                        default: 'metadata',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
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
                // Note: For full implementation, you would need to integrate with embeddings
                // This is a simplified version showing the structure

                const tableName = this.getNodeParameter('tableName', 0) as string;

                if (operation === 'insert') {
                    // Insert operation - would need document data and embeddings
                    // Placeholder for actual implementation
                    returnData.push({
                        json: {
                            success: true,
                            message: 'Insert operation would be implemented here with embeddings',
                        },
                    });
                } else if (operation === 'retrieve') {
                    const query = this.getNodeParameter('query', 0) as string;
                    const topK = this.getNodeParameter('topK', 0) as number;

                    // Retrieve operation - would need embeddings for similarity search
                    // Placeholder for actual implementation
                    returnData.push({
                        json: {
                            success: true,
                            message: 'Retrieve operation would be implemented here with embeddings',
                            query,
                            topK,
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
