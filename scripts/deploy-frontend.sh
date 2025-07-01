#!/bin/bash

# Frontend Deployment Script for ROIC Application
# This script deploys the Next.js frontend to AWS EC2

set -e

# Configuration
EC2_HOST="54.199.201.201"
EC2_USER="ubuntu"
DEPLOY_PATH="/opt/roic/frontend"
SERVICE_NAME="roic-frontend"
NODE_PORT="3000"

echo "🚀 Starting frontend deployment to AWS EC2..."

# Function to check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^${SERVICE_NAME}\.service"
}

# Function to create systemd service
create_service() {
    echo "📝 Creating systemd service for frontend..."
    
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=ROIC Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${DEPLOY_PATH}
Environment=NODE_ENV=production
Environment=PORT=${NODE_PORT}
Environment=NEXT_PUBLIC_API_URL=http://${EC2_HOST}:3001/api
Environment=NEXT_PUBLIC_APP_NAME=ROIC分析アプリケーション
Environment=NEXT_PUBLIC_APP_VERSION=1.0.0
ExecStart=/usr/bin/npm start
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
    echo "🛑 Stopping existing frontend service..."
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
cp -r .next ${DEPLOY_PATH}/
cp -r public ${DEPLOY_PATH}/
cp package.json ${DEPLOY_PATH}/
cp package-lock.json ${DEPLOY_PATH}/
cp next.config.ts ${DEPLOY_PATH}/

# Install production dependencies
echo "📥 Installing production dependencies..."
cd ${DEPLOY_PATH}
npm ci --production

# Create or update systemd service
if ! service_exists; then
    create_service
fi

# Start the service
echo "▶️ Starting frontend service..."
sudo systemctl start ${SERVICE_NAME}

# Check service status
echo "🔍 Checking service status..."
sleep 5
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✅ Frontend service is running successfully"
    echo "🌐 Frontend accessible at: http://${EC2_HOST}:${NODE_PORT}"
else
    echo "❌ Frontend service failed to start"
    echo "📋 Service logs:"
    sudo journalctl -u ${SERVICE_NAME} --no-pager --lines=20
    exit 1
fi

# Health check
echo "🏥 Performing health check..."
sleep 10
if curl -f -s http://localhost:${NODE_PORT}/ > /dev/null; then
    echo "✅ Frontend health check passed"
else
    echo "⚠️ Frontend health check failed, but service is running"
    echo "📋 This may be normal if the app is still starting up"
fi

echo "🎉 Frontend deployment completed successfully!"
echo "📊 Service status: $(sudo systemctl is-active ${SERVICE_NAME})"
echo "🔗 Access the application at: http://${EC2_HOST}:${NODE_PORT}"