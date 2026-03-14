/**
 * Retry Manager for GSEP
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 */

export interface RetryConfig {
    maxAttempts?: number; // default: 3
    initialDelay?: number; // default: 1000ms
    maxDelay?: number; // default: 10000ms
    backoffMultiplier?: number; // default: 2
    shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry Manager
 */
export class RetryManager {
    private config: Required<Omit<RetryConfig, 'shouldRetry'>> & {
        shouldRetry?: (error: Error) => boolean;
    };

    constructor(config: RetryConfig = {}) {
        this.config = {
            maxAttempts: config.maxAttempts ?? 3,
            initialDelay: config.initialDelay ?? 1000,
            maxDelay: config.maxDelay ?? 10000,
            backoffMultiplier: config.backoffMultiplier ?? 2,
            shouldRetry: config.shouldRetry,
        };
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error;
        let delay = this.config.initialDelay;

        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                if (
                    attempt === this.config.maxAttempts ||
                    (this.config.shouldRetry && !this.config.shouldRetry(lastError))
                ) {
                    throw lastError;
                }

                await this.delay(delay);
                delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
            }
        }

        throw lastError!;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
