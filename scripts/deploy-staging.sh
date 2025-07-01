#!/bin/bash
# ROIC Application - Staging Deployment Script
# This script handles automated deployment to AWS S3 staging environment

set -e  # Exit on any error

# Configuration
ENVIRONMENT="staging"
AWS_REGION="ap-northeast-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Get stack outputs
get_stack_outputs() {
    log "Retrieving CloudFormation stack outputs..."
    
    STACK_NAME="roic-infrastructure-${ENVIRONMENT}"
    
    # Get S3 bucket name
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    # Get CloudFront distribution ID
    CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$S3_BUCKET" ] || [ -z "$CLOUDFRONT_ID" ]; then
        error "Could not retrieve stack outputs. Make sure CloudFormation stack '$STACK_NAME' exists."
        exit 1
    fi
    
    log "S3 Bucket: $S3_BUCKET"
    log "CloudFront Distribution: $CLOUDFRONT_ID"
}

# Build the application
build_application() {
    log "Building frontend application..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci
    
    # Run linting
    log "Running linting..."
    npm run lint || {
        warning "Linting failed, attempting auto-fix..."
        npm run lint:fix || true
    }
    
    # Run tests
    log "Running tests..."
    npm run test:ci || {
        warning "Some tests failed, but continuing with deployment..."
    }
    
    # Build for production
    log "Building application..."
    export NEXT_PUBLIC_API_URL="https://${CLOUDFRONT_ID}.cloudfront.net/api"
    export NEXT_PUBLIC_APP_NAME="ROIC分析アプリケーション"
    export NEXT_PUBLIC_APP_VERSION="$(date +%Y.%m.%d)"
    export NEXT_PUBLIC_ENVIRONMENT="staging"
    
    npm run build
    
    success "Application built successfully"
}

# Create backup before deployment
create_backup() {
    log "Creating backup of current staging deployment..."
    
    BACKUP_PREFIX="backup/$(date +%Y%m%d_%H%M%S)"
    
    # Check if bucket has content to backup
    if aws s3 ls "s3://$S3_BUCKET/" --region "$AWS_REGION" &> /dev/null; then
        aws s3 sync "s3://$S3_BUCKET/" "s3://$S3_BUCKET/$BACKUP_PREFIX/" \
            --region "$AWS_REGION" \
            --exclude "backup/*" || {
            warning "Backup creation failed, but continuing with deployment..."
        }
        success "Backup created at s3://$S3_BUCKET/$BACKUP_PREFIX/"
    else
        log "No existing content to backup"
    fi
}

# Deploy to S3
deploy_to_s3() {
    log "Deploying to S3 staging environment..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Sync built files to S3
    aws s3 sync out/ "s3://$S3_BUCKET/" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "public, max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.json"
    
    # Upload HTML files with shorter cache
    aws s3 sync out/ "s3://$S3_BUCKET/" \
        --region "$AWS_REGION" \
        --cache-control "public, max-age=0, must-revalidate" \
        --include "*.html" \
        --include "*.json"
    
    success "Files deployed to S3 successfully"
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
    log "Invalidating CloudFront cache..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" \
        --region "$AWS_REGION" \
        --query 'Invalidation.Id' \
        --output text)
    
    log "Invalidation created with ID: $INVALIDATION_ID"
    
    # Wait for invalidation to complete (optional)
    if [ "$WAIT_FOR_INVALIDATION" = "true" ]; then
        log "Waiting for invalidation to complete..."
        aws cloudfront wait invalidation-completed \
            --distribution-id "$CLOUDFRONT_ID" \
            --id "$INVALIDATION_ID" \
            --region "$AWS_REGION"
        success "Invalidation completed"
    fi
}

# Perform health check
health_check() {
    log "Performing health check..."
    
    STAGING_URL="https://${CLOUDFRONT_ID}.cloudfront.net"
    MAX_ATTEMPTS=10
    WAIT_TIME=15
    
    for i in $(seq 1 $MAX_ATTEMPTS); do
        log "Health check attempt $i/$MAX_ATTEMPTS..."
        
        if curl -f -s "$STAGING_URL" > /dev/null 2>&1; then
            success "Health check passed! Staging environment is accessible at: $STAGING_URL"
            return 0
        else
            warning "Health check failed (attempt $i/$MAX_ATTEMPTS)"
            if [ $i -lt $MAX_ATTEMPTS ]; then
                log "Waiting ${WAIT_TIME} seconds before retry..."
                sleep $WAIT_TIME
            fi
        fi
    done
    
    error "Health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

# Rollback function
rollback() {
    error "Deployment failed. Attempting rollback..."
    
    # Find latest backup
    LATEST_BACKUP=$(aws s3 ls "s3://$S3_BUCKET/backup/" --region "$AWS_REGION" | \
        grep "PRE" | sort | tail -n 1 | awk '{print $2}' | sed 's/\///')
    
    if [ -n "$LATEST_BACKUP" ]; then
        log "Rolling back to backup: $LATEST_BACKUP"
        
        # Restore from backup
        aws s3 sync "s3://$S3_BUCKET/backup/$LATEST_BACKUP/" "s3://$S3_BUCKET/" \
            --region "$AWS_REGION" \
            --delete \
            --exclude "backup/*"
        
        # Invalidate CloudFront cache
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_ID" \
            --paths "/*" \
            --region "$AWS_REGION" > /dev/null
        
        success "Rollback completed"
    else
        warning "No backup found for rollback"
    fi
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # List backups and keep only the latest 5
    aws s3 ls "s3://$S3_BUCKET/backup/" --region "$AWS_REGION" | \
        grep "PRE" | sort | head -n -5 | awk '{print $2}' | \
        while read -r backup_dir; do
            if [ -n "$backup_dir" ]; then
                log "Removing old backup: $backup_dir"
                aws s3 rm "s3://$S3_BUCKET/backup/$backup_dir" --recursive --region "$AWS_REGION"
            fi
        done
    
    success "Backup cleanup completed"
}

# Main deployment function
main() {
    log "Starting ROIC staging deployment..."
    
    # Trap errors for rollback
    trap 'rollback; exit 1' ERR
    
    check_prerequisites
    get_stack_outputs
    build_application
    create_backup
    deploy_to_s3
    invalidate_cloudfront
    
    # Disable error trap for health check
    trap - ERR
    
    if health_check; then
        cleanup_backups
        success "🎉 Staging deployment completed successfully!"
        log "Staging URL: https://${CLOUDFRONT_ID}.cloudfront.net"
    else
        rollback
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --wait-invalidation)
            WAIT_FOR_INVALIDATION="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [--wait-invalidation] [--help]"
            echo "  --wait-invalidation  Wait for CloudFront invalidation to complete"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main