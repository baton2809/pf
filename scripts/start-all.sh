#!/bin/bash

set -e

ROOT_ENV=".env"

echo "Starting PitchForge services..."

# check if .env exists
if [ ! -f "$ROOT_ENV" ]; then
    echo "Error: .env file not found. Run ./scripts/setup-ml-service.sh first"
    exit 1
fi

# determine which mode to use
ML_MODE="external"
if grep -q "ML_SERVICE_MODE=local" "$ROOT_ENV" 2>/dev/null; then
    ML_MODE="local"
elif grep -q "ML_SERVICE_MODE=external" "$ROOT_ENV" 2>/dev/null; then
    ML_MODE="external"
else
    # fallback: check ML service URL to determine mode
    if grep -q "PITCH_ML_SERVICE_URL=http://pitch-ml-service" "$ROOT_ENV" 2>/dev/null; then
        ML_MODE="local"
    fi
fi

# choose appropriate docker-compose file
if [ "$ML_MODE" = "local" ]; then
    COMPOSE_FILE="docker-compose-local.yml"
    ML_ENDPOINT="http://localhost:5001"
else
    COMPOSE_FILE="docker-compose.yml"
    ML_ENDPOINT="$(grep PITCH_ML_SERVICE_URL= $ROOT_ENV | cut -d'=' -f2)"
fi

echo "Mode: $ML_MODE"
echo "Using compose file: $COMPOSE_FILE"

# check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found"
    exit 1
fi

echo "Starting Docker Compose services..."
docker-compose -f "$COMPOSE_FILE" up -d

sleep 3

echo ""
echo "Service status:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "Services started successfully!"
echo "Frontend: http://localhost:3005"
echo "Backend API: http://localhost:3000"
echo "ML Service: $ML_ENDPOINT"
echo "Database: postgresql://localhost:5432"

echo ""
echo "To view logs: docker-compose -f $COMPOSE_FILE logs -f [service_name]"
echo "To stop services: docker-compose -f $COMPOSE_FILE down"