FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/server/package.json packages/server/
COPY packages/gsep/package.json packages/gsep/
COPY packages/adapters-llm/anthropic/package.json packages/adapters-llm/anthropic/
COPY packages/adapters-llm/openai/package.json packages/adapters-llm/openai/
COPY packages/adapters-llm/google/package.json packages/adapters-llm/google/
COPY packages/adapters-llm/ollama/package.json packages/adapters-llm/ollama/
COPY packages/adapters-llm/perplexity/package.json packages/adapters-llm/perplexity/
COPY packages/adapters-storage/postgres/package.json packages/adapters-storage/postgres/
COPY packages/payments/package.json packages/payments/

# Install dependencies
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy source
COPY . .

# Build
RUN npm run build || true

EXPOSE 3000

# Default: run GSEP proxy server
CMD ["node", "packages/cli/dist/index.js", "serve", "--port", "3000", "--host", "0.0.0.0"]
