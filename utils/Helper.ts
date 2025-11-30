import type {
        INodeExecutionData,
        ISupplyDataFunctions,
        IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { Client } from 'pg';

// Patterns that indicate critical database errors requiring workflow stop
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

/**
 * Base logger interface matching n8n's logger
 */
export interface BaseLogger {
        info: (message: string, meta?: object) => void;
        error: (message: string, meta?: object) => void;
}

/**
 * Custom logger wrapper with debug mode support.
 * Logs debug messages only when debug mode is enabled.
 */
export class MyLogger {
        private baseLogger: BaseLogger;
        private debugMode: boolean;

        constructor(baseLogger: BaseLogger, debugMode: boolean = false) {
                this.baseLogger = baseLogger;
                this.debugMode = debugMode;
        }

        /**
         * Log debug message (only when debug mode is on)
         */
        debug(message: string, meta?: unknown): void {
                if (!this.debugMode) return;

                const formattedMessage = this.formatMessage(message, meta);
                this.baseLogger.info(formattedMessage);
        }

        /**
         * Log info message (always visible)
         */
        info(message: string, meta?: unknown): void {
                const formattedMessage = this.formatMessage(message, meta);
                this.baseLogger.info(formattedMessage);
        }

        /**
         * Log error message (always visible)
         */
        error(message: string, meta?: unknown): void {
                const formattedMessage = this.formatMessage(message, meta);
                this.baseLogger.error(formattedMessage);
        }

        /**
         * Format message with optional metadata
         */
        private formatMessage(message: string, meta?: unknown): string {
                if (meta === undefined) return message;

                try {
                        const metaStr = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
                        return `${message} | ${metaStr}`;
                } catch {
                        return `${message} | [serialization error]`;
                }
        }
}

/**
 * Check if error is critical and should stop workflow execution
 */
export function isCriticalError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return CRITICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Context for tool function wrapper
 */
export interface ToolFuncWrapperContext {
        context: ISupplyDataFunctions;
        itemIndex: number;
        logger: MyLogger;
}

/**
 * Wrap tool function to handle n8n input/output registration.
 * Must wrap func BEFORE creating DynamicStructuredTool.
 */
export function createWrappedToolFunc<TInput extends { query: string }>(
        originalFunc: (input: TInput) => Promise<string>,
        wrapperContext: ToolFuncWrapperContext,
): (input: TInput) => Promise<string> {
        const { context, itemIndex, logger } = wrapperContext;

        return async (input: TInput): Promise<string> => {
                logger.debug('[Wrapper] Func called', { query: input.query });

                const connectionType = NodeConnectionTypes.AiTool;
                const inputPayload: IDataObject = { query: input.query };

                // Register input with n8n UI
                const { index } = context.addInputData(connectionType, [[{ json: inputPayload }]]);
                logger.debug('[Wrapper] Input registered', { index });

                try {
                        // Execute original function
                        const response = await originalFunc(input);
                        logger.debug('[Wrapper] Func completed', { responseLength: response?.length });

                        // Parse response for output registration
                        let outputData: IDataObject[];
                        try {
                                outputData = JSON.parse(response);
                                if (!Array.isArray(outputData)) {
                                        outputData = [{ response: outputData }];
                                }
                        } catch {
                                outputData = [{ response }];
                        }

                        // Register output with n8n UI
                        const outputItems: INodeExecutionData[] = outputData.map((item) => ({
                                json: item,
                                pairedItem: { item: itemIndex },
                        }));

                        context.addOutputData(connectionType, index, [outputItems]);
                        logger.info('[Tool] Search completed', { resultCount: outputItems.length });

                        return response;
                } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logger.error('[Tool] Execution failed', { error: errorMessage });

                        // Register error output
                        context.addOutputData(connectionType, index, [
                                [{ json: { error: errorMessage }, pairedItem: { item: itemIndex } }],
                        ]);

                        // Throw NodeOperationError for critical errors to stop workflow
                        if (isCriticalError(error)) {
                                logger.info('[Tool] Critical error - stopping workflow');
                                throw new NodeOperationError(context.getNode(), errorMessage, { itemIndex });
                        }

                        throw error;
                }
        };
}

/**
 * Quote SQL identifier to prevent injection.
 * Supports simple names and schema.table format.
 */
export function quoteIdentifier(value: string): string {
        if (value.includes('.')) {
                // Handle schema.table format
                const parts = value.split('.');
                return parts
                        .map((part) => {
                                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
                                        throw new Error(`Invalid identifier part: ${part} in ${value}`);
                                }
                                return `"${part}"`;
                        })
                        .join('.');
        }

        // Simple identifier validation
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                throw new Error(`Invalid identifier: ${value}`);
        }

        return `"${value}"`;
}

/**
 * Execute SQL query with proper result formatting
 */
export async function executeQuery(
        client: Client,
        sql: string,
        params: unknown[],
): Promise<INodeExecutionData[]> {
        const result = await client.query(sql, params);
        return result.rows.map((row) => ({ json: row }));
}
