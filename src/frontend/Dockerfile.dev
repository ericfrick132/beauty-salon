# Development Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]