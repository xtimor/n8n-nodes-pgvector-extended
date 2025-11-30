import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { PoolClient, Client } from 'pg';

export interface RLSExecutionContext {
    role?: string;
    client: Client | PoolClient;
}

/**
 * Execute a database operation with RLS role switching
 * @param context - Execution context with client and optional role
 * @param operation - Async operation to execute
 * @returns Result of the operation
 */
export async function executeWithRole<T>(
    context: RLSExecutionContext,
    operation: (client: Client | PoolClient) => Promise<T>,
): Promise<T> {
    const { role, client } = context;

    try {
        // If role specified, use transaction with role switching
        if (role && role.trim() !== '') {
            await client.query('BEGIN');
            // Set the role for this transaction only
            await client.query(`SET LOCAL ROLE "${role}"`);

            const result = await operation(client);

            await client.query('COMMIT');
            return result;
        } else {
            // No role - execute without transaction
            return await operation(client);
        }
    } catch (error) {
        // Rollback only if we started a transaction
        if (role && role.trim() !== '') {
            await client.query('ROLLBACK');
        }
        throw error;
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
    client: Client | PoolClient,
    sqlQuery: string,
    role?: string,
): Promise<INodeExecutionData[]> {
    const executionContext: RLSExecutionContext = { client, role };

    const rows = await executeWithRole(executionContext, async (queryClient) => {
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
