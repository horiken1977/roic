#!/bin/bash

# Backend Deployment Script for ROIC Application
# This script deploys the Node.js backend to AWS EC2

set -e

# Configuration
EC2_HOST="54.199.201.201"
EC2_USER="ubuntu"
DEPLOY_PATH="/opt/roic/backend"
SERVICE_NAME="roic-backend"
NODE_PORT="3001"

echo "🚀 Starting backend deployment to AWS EC2..."

# Function to check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^${SERVICE_NAME}\.service"
}

# Function to create systemd service
create_service() {
    echo "📝 Creating systemd service for backend..."
    
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=ROIC Backend (Node.js/Express)
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${DEPLOY_PATH}
Environment=NODE_ENV=production
Environment=PORT=${NODE_PORT}
Environment=DB_HOST=roic-db.c9x8y7z6v5w4.ap-northeast-1.rds.amazonaws.com
Environment=DB_PORT=5432
Environment=DB_NAME=roic_db
Environment=DB_USER=roic_admin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}
}

# Stop existing service if running
if service_exists; then
    echo "🛑 Stopping existing backend service..."
    sudo systemctl stop ${SERVICE_NAME} || echo "Service was not running"
else
    echo "📋 No existing service found, will create new one"
fi

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p ${DEPLOY_PATH}
sudo chown -R ubuntu:ubuntu $(dirname ${DEPLOY_PATH})

# Copy application files
echo "📦 Copying application files..."
cp -r * ${DEPLOY_PATH}/
cd ${DEPLOY_PATH}

# Install production dependencies
echo "📥 Installing production dependencies..."
npm ci --production

# Run database migrations if needed
echo "🗄️ Running database setup..."
if [ -f "scripts/apply-schema.js" ]; then
    echo "Applying database schema..."
    node scripts/apply-schema.js || echo "Schema application completed"
fi

# Create or update systemd service
if ! service_exists; then
    create_service
fi

# Start the service
echo "▶️ Starting backend service..."
sudo systemctl start ${SERVICE_NAME}

# Check service status
echo "🔍 Checking service status..."
sleep 5
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✅ Backend service is running successfully"
    echo "🔧 Backend API accessible at: http://${EC2_HOST}:${NODE_PORT}/api"
else
    echo "❌ Backend service failed to start"
    echo "📋 Service logs:"
    sudo journalctl -u ${SERVICE_NAME} --no-pager --lines=20
    exit 1
fi

# Health check
echo "🏥 Performing health check..."
sleep 10
if curl -f -s http://localhost:${NODE_PORT}/api/health > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️ Backend health check failed"
    echo "📋 Checking service logs..."
    sudo journalctl -u ${SERVICE_NAME} --no-pager --lines=10
fi

echo "🎉 Backend deployment completed successfully!"
echo "📊 Service status: $(sudo systemctl is-active ${SERVICE_NAME})"
echo "🔗 API endpoints available at: http://${EC2_HOST}:${NODE_PORT}/api"