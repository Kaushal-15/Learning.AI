# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app/frontend
# Copy frontend dependency files
COPY app/frontend/package*.json ./
# Install dependencies
RUN npm ci
# Copy frontend source code
COPY app/frontend/ .
# Build the frontend
RUN npm run build

# Stage 2: Setup Backend
FROM node:20-alpine
WORKDIR /app
# Copy backend dependency files
COPY app/Backend/package*.json ./
# Install production dependencies
RUN npm ci --only=production
# Copy backend source code
COPY app/Backend/ .
# Copy built frontend assets to public directory
COPY --from=builder /app/frontend/dist ./public

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
