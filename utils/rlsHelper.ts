import type {
    IExecuteFunctions,
    INodeExecutionData,
    ISupplyDataFunctions,
    IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { PoolClient, Client } from 'pg';

export interface RLSExecutionContext {
    role?: string;
    client: Client | PoolClient;
}

export interface Logger {
    info: (message: string, meta?: object) => void;
    error: (message: string, meta?: object) => void;
}

const CRITICAL_ERROR_PATTERNS = [
    /relation .* does not exist/i,
    /table .* does not exist/i,
    /column .* does not exist/i,
    /database .* does not exist/i,
    /permission denied/i,
    /authentication failed/i,
    /password authentication failed/i,
    /connection refused/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /ETIMEDOUT/i,
    /no pg_hba\.conf entry/i,
    /SSL.*required/i,
    /role .* does not exist/i,
    /Invalid identifier/i,
];

export function isCriticalError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return CRITICAL_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Creates a debug logging function that only logs when debug mode is enabled.
 * @param logger - The n8n logger instance
 * @param debug - Whether debug mode is enabled
 * @returns A function that logs messages when debug is true
 */
export function createLogDebug(logger: Logger, debug: boolean) {
    return (message: string, info?: unknown) => {
        if (!debug) return;

        let logMessage = message;
        if (info !== undefined) {
            try {
                const infoStr = typeof info === 'object' ? JSON.stringify(info) : String(info);
                logMessage = `${message} | ${infoStr}`;
            } catch {
                logMessage = `${message} | [Error serializing info]`;
            }
        }
        logger.info(logMessage);
    };
}

export interface ToolFuncWrapperContext {
    context: ISupplyDataFunctions;
    itemIndex: number;
    logger: Logger;
}

/**
 * Creates a wrapped function for DynamicStructuredTool that handles n8n input/output registration.
 * This approach wraps the func BEFORE creating the tool, ensuring proper interception.
 */
export function createWrappedToolFunc<TInput extends { query: string }>(
    originalFunc: (input: TInput) => Promise<string>,
    wrapperContext: ToolFuncWrapperContext,
): (input: TInput) => Promise<string> {
    const { context, itemIndex, logger } = wrapperContext;

    return async (input: TInput): Promise<string> => {
        logger.info('[ToolFunc] Wrapped func called', { query: input.query });

        const connectionType = NodeConnectionTypes.AiTool;

        const inputPayload: IDataObject = { query: input.query };

        logger.info('[ToolFunc] Registering input with n8n');
        const { index } = context.addInputData(connectionType, [
            [{ json: inputPayload }],
        ]);
        logger.info('[ToolFunc] Input registered', { index });

        try {
            logger.info('[ToolFunc] Calling original func');
            const response = await originalFunc(input);
            logger.info('[ToolFunc] Original func returned', { responseLength: response?.length });

            let outputData: IDataObject[];
            try {
                outputData = JSON.parse(response);
                if (!Array.isArray(outputData)) {
                    outputData = [{ response: outputData }];
                }
            } catch {
                outputData = [{ response }];
            }

            const outputItems: INodeExecutionData[] = outputData.map((item) => ({
                json: item,
                pairedItem: { item: itemIndex },
            }));

            logger.info('[ToolFunc] Registering output with n8n', { outputCount: outputItems.length });
            context.addOutputData(connectionType, index, [outputItems]);
            logger.info('[ToolFunc] Output registered successfully');

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.info('[ToolFunc] Error caught', { errorMessage });

            context.addOutputData(connectionType, index, [
                [{ json: { error: errorMessage }, pairedItem: { item: itemIndex } }],
            ]);

            const isCritical = isCriticalError(error);
            logger.info('[ToolFunc] Error classification', { isCritical, errorMessage });

            if (isCritical) {
                logger.info('[ToolFunc] Throwing NodeOperationError for critical error');
                throw new NodeOperationError(
                    context.getNode(),
                    errorMessage,
                    { itemIndex },
                );
            }

            throw error;
        }
    };
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
