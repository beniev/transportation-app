FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build args for environment variables at build time
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# Build the app
RUN npm run build

# Production stage - serve with lightweight static server
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD sh -c "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"
