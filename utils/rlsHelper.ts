import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { Pool, PoolClient } from 'pg';

export interface RLSExecutionContext {
    role?: string;
    pool: Pool;
}

/**
 * Execute a database operation with RLS role switching
 * @param context - Execution context with pool and optional role
 * @param operation - Async operation to execute
 * @returns Result of the operation
 */
export async function executeWithRole<T>(
    context: RLSExecutionContext,
    operation: (client?: PoolClient) => Promise<T>,
): Promise<T> {
    const { role, pool } = context;

    // If no role specified, execute normally
    if (!role || role.trim() === '') {
        return await operation();
    }

    // Execute with role switching in a transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Set the role for this transaction only
        await client.query(`SET LOCAL ROLE "${role}"`);

        const result = await operation(client);

        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get RLS role from node parameters or credentials
 * Node parameter takes priority over credentials
 */
export function getRLSRole(
    context: IExecuteFunctions,
    itemIndex: number,
    credentialsRole?: string,
): string | undefined {
    try {
        // Try to get from node parameters first
        const nodeRole = context.getNodeParameter('rlsRole', itemIndex, '') as string;
        if (nodeRole && nodeRole.trim() !== '') {
            return nodeRole.trim();
        }
    } catch {
        // Parameter doesn't exist, continue
    }

    // Fall back to credentials role
    if (credentialsRole && credentialsRole.trim() !== '') {
        return credentialsRole.trim();
    }

    return undefined;
}

/**
 * Execute custom SQL query with proper error handling
 */
export async function executeCustomQuery(
    pool: Pool,
    sqlQuery: string,
    role?: string,
): Promise<INodeExecutionData[]> {
    const executionContext: RLSExecutionContext = { pool, role };

    const rows = await executeWithRole(executionContext, async (client) => {
        const queryClient = client || pool;
        const result = await queryClient.query(sqlQuery);
        return result.rows;
    });

    // Convert rows to n8n format
    return rows.map((row) => ({
        json: row,
    }));
}

export function quoteIdentifier(value: string): string {
    // Handle schema.table format
    if (value.includes('.')) {
        const parts = value.split('.');
        return parts
            .map(part => {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
                    throw new Error(`Invalid identifier part: ${part} in ${value}`);
                }
                return `"${part}"`;
            })
            .join('.');
    }

    // Simple identifier
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        throw new Error(`Invalid identifier: ${value}`);
    }

    return `"${value}"`;
}

