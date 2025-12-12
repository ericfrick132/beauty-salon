# Build static marketing (Next export)
FROM node:18-alpine AS marketing-build
WORKDIR /marketing
ENV NEXT_TELEMETRY_DISABLED=1

COPY src/marketing-next/package.json ./
RUN npm install
COPY src/marketing-next ./
RUN npm run build && npm run export

# Build SPA (CRA)
FROM node:18-alpine as build
WORKDIR /app

COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend ./
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy built app to nginx html directory
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=marketing-build /marketing/out /usr/share/nginx/marketing

# Copy production nginx config
COPY src/frontend/nginx.prod.conf /etc/nginx/conf.d/default.conf

# CRITICAL: Health check for Digital Ocean App Platform
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Expose port 80 (must match app.yaml http_port)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
