#!/bin/bash

# PitchForge Development Script
# Simple commands for managing development environment

rebuild_all() {
    echo "REBUILDING ALL SERVICES WITH CLEAN SLATE"
    echo "This will:"
    echo "  - Stop all containers"
    echo "  - Remove all volumes and cached data"
    echo "  - Rebuild all images from scratch"
    echo "  - Start all services"
    echo ""
    echo "Press Ctrl+C to cancel, or wait 3 seconds..."
    sleep 3
    
    echo "Stopping and removing containers with volumes..."
    docker compose down --volumes --remove-orphans --rmi local
    
    echo "Cleaning Docker cache and build cache..."
    docker system prune -f
    docker builder prune -af
    
    echo "Rebuilding all services..."
    docker compose build --no-cache --pull
    
    echo "Starting all services..."
    docker compose up -d
    
    echo "Rebuild complete!"
    show_endpoints
}

clean_all() {
    echo "DEEP CLEAN - REMOVING EVERYTHING"
    echo "This will:"
    echo "  - Stop all containers"
    echo "  - Remove all volumes and data"
    echo "  - Remove all images and cache"
    echo "  - Clean up completely"
    echo ""
    echo "WARNING: All data will be lost!"
    echo "Press Ctrl+C to cancel, or wait 5 seconds..."
    sleep 5
    
    echo "Stopping all containers..."
    docker compose down --volumes --rmi all --remove-orphans
    
    echo "Deep cleaning Docker system..."
    docker system prune -af --volumes
    docker builder prune -af
    
    echo "Removing node_modules..."
    rm -rf backend/node_modules frontend/node_modules
    
    echo "Removing uploads..."
    rm -rf backend/uploads
    
    echo "Deep clean complete! Everything removed."
}

start_all() {
    echo "STARTING ALL SERVICES"
    
    echo "Starting services..."
    docker compose up -d
    
    echo "Waiting for services to be ready..."
    sleep 5
    
    echo "All services started!"
    show_endpoints
}

show_logs() {
    service=$1
    
    if [ -z "$service" ]; then
        echo "AVAILABLE SERVICES:"
        docker compose ps --services
        echo ""
        echo "Usage:"
        echo "  ./dev-start.sh logs [service]  # Show logs for specific service"
        echo "  ./dev-start.sh logs all        # Show logs for all services"
        return
    fi
    
    if [ "$service" = "all" ]; then
        echo "SHOWING LOGS FOR ALL SERVICES (Ctrl+C to stop)"
        docker compose logs -f --tail=100
    else
        echo "SHOWING LOGS FOR: $service (Ctrl+C to stop)"
        docker compose logs -f --tail=100 "$service"
    fi
}

show_status() {
    echo "PITCHFORGE SERVICES STATUS"
    echo "=============================="
    docker compose ps
    
    echo ""
    echo "ENDPOINTS:"
    show_endpoints
    
    echo ""
    echo "VOLUMES:"
    docker volume ls | grep "$(basename $(pwd))" || echo "  No project volumes found"
}

show_endpoints() {
    echo "  Frontend:   http://localhost:3005"
    echo "  Backend:    http://localhost:3000"
    echo "  ML Service: http://localhost:5000"  
    echo "  Database:   postgresql://localhost:5432"
}

stop_all() {
    echo "Stopping all services..."
    docker compose down --remove-orphans
    echo "All services stopped"
}

# Main command handling
case "$1" in
    "rebuild"|"1")
        rebuild_all
        ;;
        
    "clean"|"2") 
        clean_all
        ;;
        
    "start"|"3"|"")
        start_all
        ;;
        
    "logs"|"4")
        show_logs "$2"
        ;;
        
    "status"|"s")
        show_status
        ;;
        
    "stop")
        stop_all
        ;;
        
    *)
        echo "PitchForge Development Commands"
        echo "==============================="
        echo ""
        echo "Main Commands:"
        echo "  ./dev-start.sh rebuild    # 1) Rebuild all with clean slate"
        echo "  ./dev-start.sh clean      # 2) Deep clean everything"
        echo "  ./dev-start.sh start      # 3) Start all services"
        echo "  ./dev-start.sh logs [svc] # 4) Show service logs"
        echo ""
        echo "Quick Commands:"
        echo "  ./dev-start.sh 1          # Same as rebuild"
        echo "  ./dev-start.sh 2          # Same as clean"  
        echo "  ./dev-start.sh 3          # Same as start"
        echo "  ./dev-start.sh 4 [svc]    # Same as logs"
        echo ""
        echo "Other Commands:"
        echo "  ./dev-start.sh status     # Show service status"
        echo "  ./dev-start.sh stop       # Stop all services"
        echo ""
        echo "Examples:"
        echo "  ./dev-start.sh             # Start everything"
        echo "  ./dev-start.sh logs all    # Show all logs"
        echo "  ./dev-start.sh logs backend # Show backend logs"
        echo "  ./dev-start.sh 1           # Full rebuild"
        echo ""
        echo "Tip: Use numbers 1-4 for quick access to main functions"
        ;;
esac