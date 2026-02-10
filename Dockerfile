# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app/frontend
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend/ .
RUN npm run build

# Stage 2: Backend Runner
FROM node:20-alpine
WORKDIR /app
COPY app/Backend/package*.json ./
RUN npm ci --only=production
COPY app/Backend/ .
# Copy frontend build to public directory
COPY --from=builder /app/frontend/dist ./public

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
