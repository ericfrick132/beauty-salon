# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["BookingPro.API.csproj", "./"]
RUN dotnet restore "BookingPro.API.csproj"

# Copy everything else and build
COPY . .
RUN dotnet build "BookingPro.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "BookingPro.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app

# Install dependencies for health checks and configure non-root user
RUN apk add --no-cache curl icu-libs krb5-libs libgcc libintl libssl3 libstdc++ zlib && \
    adduser -D -u 1000 appuser

# Copy published files
COPY --from=publish --chown=appuser:appuser /app/publish .

# Configure non-root user
USER appuser

# Set environment variables for Digital Ocean
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ping || exit 1

# Expose port and set entry point
EXPOSE 8080
ENTRYPOINT ["dotnet", "BookingPro.API.dll"]