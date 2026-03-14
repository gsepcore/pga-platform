/**
 * Circuit Breaker for GSEP
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Prevents cascade failures with circuit breaker pattern.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    failureThreshold?: number; // default: 5
    successThreshold?: number; // default: 2
    timeout?: number; // default: 60000 (1 minute)
    resetTimeout?: number; // default: 30000 (30 seconds)
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
}

/**
 * Circuit Breaker
 *
 * Implements circuit breaker pattern to prevent cascade failures.
 */
export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures = 0;
    private successes = 0;
    private lastFailureTime?: Date;
    private lastSuccessTime?: Date;
    private totalCalls = 0;
    private totalFailures = 0;
    private totalSuccesses = 0;
    private resetTimer?: NodeJS.Timeout;

    private config: Required<CircuitBreakerConfig>;

    constructor(config: CircuitBreakerConfig = {}) {
        this.config = {
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 2,
            timeout: config.timeout ?? 60000,
            resetTimeout: config.resetTimeout ?? 30000,
        };
    }

    /**
     * Execute function with circuit breaker
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalCalls++;

        // Check if circuit is open
        if (this.state === 'OPEN') {
            // Check if we should try half-open
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Record success
     */
    private onSuccess(): void {
        this.lastSuccessTime = new Date();
        this.totalSuccesses++;

        if (this.state === 'HALF_OPEN') {
            this.successes++;

            if (this.successes >= this.config.successThreshold) {
                this.reset();
            }
        } else {
            this.failures = 0;
        }
    }

    /**
     * Record failure
     */
    private onFailure(): void {
        this.lastFailureTime = new Date();
        this.failures++;
        this.totalFailures++;

        if (this.failures >= this.config.failureThreshold) {
            this.trip();
        }
    }

    /**
     * Trip the circuit (OPEN)
     */
    private trip(): void {
        this.state = 'OPEN';
        this.successes = 0;

        // Set reset timer
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
        }

        this.resetTimer = setTimeout(() => {
            this.state = 'HALF_OPEN';
        }, this.config.resetTimeout);
    }

    /**
     * Reset the circuit (CLOSED)
     */
    private reset(): void {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;

        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = undefined;
        }
    }

    /**
     * Check if should attempt reset
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return true;

        const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
        return timeSinceLastFailure >= this.config.resetTimeout;
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
        };
    }

    /**
     * Force open circuit
     */
    forceOpen(): void {
        this.trip();
    }

    /**
     * Force close circuit
     */
    forceClose(): void {
        this.reset();
    }
}
