# syntax=docker/dockerfile:1

# Build stage for Vite React app
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --silent || npm install --legacy-peer-deps --silent

# Copy source and build
COPY . .
RUN npm run build

# Production image: Nginx serving the built files
FROM nginx:stable-alpine

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
