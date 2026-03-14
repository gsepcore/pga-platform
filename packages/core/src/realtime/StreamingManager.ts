/**
 * Streaming Manager for GSEP
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Manages streaming responses and real-time data flows.
 */

export interface StreamChunk<T = string> {
    data: T;
    index: number;
    done: boolean;
    metadata?: Record<string, unknown>;
}

export interface StreamOptions {
    /**
     * Buffer size for chunking
     */
    bufferSize?: number;

    /**
     * Delay between chunks (ms)
     */
    chunkDelay?: number;

    /**
     * Callback for each chunk
     */
    onChunk?: (chunk: StreamChunk) => void;

    /**
     * Callback on stream completion
     */
    onComplete?: () => void;

    /**
     * Callback on error
     */
    onError?: (error: Error) => void;
}

/**
 * Streaming Manager
 *
 * Handles streaming responses with buffering and flow control.
 */
export class StreamingManager {
    /**
     * Stream text content with chunking
     */
    async *streamText(
        content: string,
        options: StreamOptions = {}
    ): AsyncGenerator<StreamChunk<string>, void, unknown> {
        const bufferSize = options.bufferSize || 50;
        const chunkDelay = options.chunkDelay || 0;

        let index = 0;

        for (let i = 0; i < content.length; i += bufferSize) {
            const data = content.slice(i, i + bufferSize);
            const done = i + bufferSize >= content.length;

            const chunk: StreamChunk<string> = {
                data,
                index: index++,
                done,
            };

            // Callback
            if (options.onChunk) {
                try {
                    options.onChunk(chunk);
                } catch (error) {
                    if (options.onError) {
                        options.onError(error as Error);
                    }
                }
            }

            yield chunk;

            // Delay if specified
            if (chunkDelay > 0 && !done) {
                await new Promise((resolve) => setTimeout(resolve, chunkDelay));
            }
        }

        // Completion callback
        if (options.onComplete) {
            try {
                options.onComplete();
            } catch (error) {
                if (options.onError) {
                    options.onError(error as Error);
                }
            }
        }
    }

    /**
     * Stream array of items
     */
    async *streamArray<T>(
        items: T[],
        options: StreamOptions = {}
    ): AsyncGenerator<StreamChunk<T>, void, unknown> {
        const chunkDelay = options.chunkDelay || 0;

        for (let i = 0; i < items.length; i++) {
            const chunk: StreamChunk<T> = {
                data: items[i],
                index: i,
                done: i === items.length - 1,
            };

            if (options.onChunk) {
                try {
                    options.onChunk(chunk as StreamChunk);
                } catch (error) {
                    if (options.onError) {
                        options.onError(error as Error);
                    }
                }
            }

            yield chunk;

            if (chunkDelay > 0 && i < items.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, chunkDelay));
            }
        }

        if (options.onComplete) {
            try {
                options.onComplete();
            } catch (error) {
                if (options.onError) {
                    options.onError(error as Error);
                }
            }
        }
    }

    /**
     * Buffer stream chunks
     */
    async *bufferStream<T>(
        stream: AsyncIterable<StreamChunk<T>>,
        bufferSize: number
    ): AsyncGenerator<StreamChunk<T[]>, void, unknown> {
        let buffer: T[] = [];
        let index = 0;

        for await (const chunk of stream) {
            buffer.push(chunk.data);

            if (buffer.length >= bufferSize || chunk.done) {
                yield {
                    data: buffer,
                    index: index++,
                    done: chunk.done,
                };

                buffer = [];
            }
        }

        // Flush remaining
        if (buffer.length > 0) {
            yield {
                data: buffer,
                index: index++,
                done: true,
            };
        }
    }

    /**
     * Map stream chunks
     */
    async *mapStream<T, U>(
        stream: AsyncIterable<StreamChunk<T>>,
        mapper: (data: T) => U | Promise<U>
    ): AsyncGenerator<StreamChunk<U>, void, unknown> {
        let index = 0;

        for await (const chunk of stream) {
            const mappedData = await mapper(chunk.data);

            yield {
                data: mappedData,
                index: index++,
                done: chunk.done,
                metadata: chunk.metadata,
            };
        }
    }

    /**
     * Filter stream chunks
     */
    async *filterStream<T>(
        stream: AsyncIterable<StreamChunk<T>>,
        predicate: (data: T) => boolean | Promise<boolean>
    ): AsyncGenerator<StreamChunk<T>, void, unknown> {
        let index = 0;

        for await (const chunk of stream) {
            const shouldInclude = await predicate(chunk.data);

            if (shouldInclude) {
                yield {
                    data: chunk.data,
                    index: index++,
                    done: chunk.done,
                    metadata: chunk.metadata,
                };
            }
        }
    }

    /**
     * Collect stream into array
     */
    async collectStream<T>(stream: AsyncIterable<StreamChunk<T>>): Promise<T[]> {
        const result: T[] = [];

        for await (const chunk of stream) {
            result.push(chunk.data);
        }

        return result;
    }

    /**
     * Merge multiple streams
     */
    async *mergeStreams<T>(
        ...streams: AsyncIterable<StreamChunk<T>>[]
    ): AsyncGenerator<StreamChunk<T>, void, unknown> {
        let index = 0;

        for (const stream of streams) {
            for await (const chunk of stream) {
                yield {
                    data: chunk.data,
                    index: index++,
                    done: false,
                    metadata: chunk.metadata,
                };
            }
        }

        // Final done chunk
        yield {
            data: '' as T,
            index: index,
            done: true,
        };
    }

    /**
     * Take first N chunks
     */
    async *takeStream<T>(
        stream: AsyncIterable<StreamChunk<T>>,
        count: number
    ): AsyncGenerator<StreamChunk<T>, void, unknown> {
        let taken = 0;

        for await (const chunk of stream) {
            if (taken >= count) {
                break;
            }

            yield {
                ...chunk,
                done: taken === count - 1 || chunk.done,
            };

            taken++;
        }
    }

    /**
     * Rate limit stream
     */
    async *rateLimitStream<T>(
        stream: AsyncIterable<StreamChunk<T>>,
        maxChunksPerSecond: number
    ): AsyncGenerator<StreamChunk<T>, void, unknown> {
        const delayMs = 1000 / maxChunksPerSecond;
        let lastChunkTime = 0;

        for await (const chunk of stream) {
            const now = Date.now();
            const timeSinceLastChunk = now - lastChunkTime;

            if (timeSinceLastChunk < delayMs) {
                await new Promise((resolve) =>
                    setTimeout(resolve, delayMs - timeSinceLastChunk)
                );
            }

            lastChunkTime = Date.now();

            yield chunk;
        }
    }
}

/**
 * Global streaming manager instance
 */
export const globalStreaming = new StreamingManager();
