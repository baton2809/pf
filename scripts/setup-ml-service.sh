#!/bin/bash

set -e

ROOT_ENV=".env"
EXTERNAL_ML_URL="http://disabled-external-service:4000"
LOCAL_ML_URL="http://pitch-ml-service:5000"
REPO_URL="https://github.com/nonexistent/pitch-ml-service.git"
SERVICE_DIR="pitch-ml-service"

echo "Setting up ML service (external or local)..."

# function to test external service availability
test_external_service() {
    echo "Testing external ML service connectivity..."
    if curl -s --max-time 10 "$EXTERNAL_ML_URL/docs" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# function to update ML service URL in .env
update_ml_url() {
    local url=$1
    local mode=$2
    
    # update PITCH_ML_SERVICE_URL
    if grep -q "PITCH_ML_SERVICE_URL=" "$ROOT_ENV" 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|PITCH_ML_SERVICE_URL=.*|PITCH_ML_SERVICE_URL=$url|" "$ROOT_ENV"
        else
            sed -i "s|PITCH_ML_SERVICE_URL=.*|PITCH_ML_SERVICE_URL=$url|" "$ROOT_ENV"
        fi
    else
        echo "" >> "$ROOT_ENV"
        echo "PITCH_ML_SERVICE_URL=$url" >> "$ROOT_ENV"
    fi
    
    # update or add ML_SERVICE_MODE
    if grep -q "ML_SERVICE_MODE=" "$ROOT_ENV" 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|ML_SERVICE_MODE=.*|ML_SERVICE_MODE=$mode|" "$ROOT_ENV"
        else
            sed -i "s|ML_SERVICE_MODE=.*|ML_SERVICE_MODE=$mode|" "$ROOT_ENV"
        fi
    else
        echo "ML_SERVICE_MODE=$mode" >> "$ROOT_ENV"
    fi
}

# try external service first
if test_external_service; then
    echo "External ML service is accessible!"
    echo "Configuring to use external ML service at $EXTERNAL_ML_URL"
    update_ml_url "$EXTERNAL_ML_URL" "external"
    echo "Configuration completed - using external ML service"
else
    echo "External ML service not accessible, setting up local service..."
    
    # setup local ML service
    if [ -d "$SERVICE_DIR" ]; then
        echo "Directory $SERVICE_DIR exists. Pulling latest changes..."
        cd "$SERVICE_DIR"
        git pull origin main || echo "Warning: git pull failed, continuing with existing code"
        cd ..
    else
        echo "Cloning pitch-ml-service repository..."
        git clone "$REPO_URL" "$SERVICE_DIR" || {
            echo "Error: Failed to clone repository. Please check the URL: $REPO_URL"
            echo "You can manually update the REPO_URL in this script"
            exit 1
        }
    fi
    
    # create local .env if needed
    if [ ! -f "$SERVICE_DIR/.env" ]; then
        echo "Creating .env file for local ML service..."
        cat > "$SERVICE_DIR/.env" << 'EOF'
# Server
HOST=0.0.0.0
PORT=5000

# Speech models
NUM_WORKERS=2
NUM_THREADS=2
WHISPER_MODEL_SIZE=medium
WHISPER_COMPUTE_TYPE=int8
WHISPER_BEAM_SIZE=5
SER_MODEL_NAME=Aniemore/wav2vec2-xlsr-53-russian-emotion-recognition
SER_SAMPLING_RATE=16000
FLOAT_ROUND_RATE=2

# LLM
OPENROUTER_API_KEY=your_key
OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
MODEL_ID=deepseek/deepseek-chat-v3.1:free
TEMPERATURE=0.2
MAX_TOKENS=800
OPENROUTER_RETRIES=2
OPENROUTER_TIMEOUT=120
EOF
    fi
    
    echo "Configuring to use local ML service at $LOCAL_ML_URL"
    update_ml_url "$LOCAL_ML_URL" "local"
    echo "Configuration completed - using local ML service"
fi

echo ""
echo "ML service setup completed successfully!"
echo "Mode: $(grep ML_SERVICE_MODE= $ROOT_ENV | cut -d'=' -f2)"
echo "URL: $(grep PITCH_ML_SERVICE_URL= $ROOT_ENV | cut -d'=' -f2)"