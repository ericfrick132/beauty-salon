# Build static marketing (Next static export)
FROM node:18-alpine AS marketing-build
WORKDIR /marketing
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=${NEXT_PUBLIC_META_PIXEL_ID}

COPY src/marketing-next/package.json ./
RUN npm install
COPY src/marketing-next ./
RUN npm run build

# Build SPA (CRA)
FROM node:18-alpine as build
WORKDIR /app

COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend ./

# CRA inlines process.env.REACT_APP_* into the bundle at `npm run build`,
# so every env consumed by the frontend must be declared as ARG+ENV here —
# DO's RUN_AND_BUILD_TIME scope alone is not enough without the explicit ARG.
ARG REACT_APP_API_URL
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=${REACT_APP_API_URL} \
    REACT_APP_GOOGLE_CLIENT_ID=${REACT_APP_GOOGLE_CLIENT_ID}

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
