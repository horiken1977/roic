#!/bin/bash
# ROIC Application - Production Deployment Script
# This script handles automated deployment to AWS S3 production environment

set -e  # Exit on any error

# Configuration
ENVIRONMENT="production"
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

# Verify staging deployment
verify_staging() {
    log "Verifying staging deployment before production..."
    
    STAGING_STACK_NAME="roic-infrastructure-staging"
    
    # Get staging CloudFront distribution ID
    STAGING_CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STAGING_STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$STAGING_CLOUDFRONT_ID" ]; then
        error "Could not find staging environment. Please deploy to staging first."
        exit 1
    fi
    
    STAGING_URL="https://${STAGING_CLOUDFRONT_ID}.cloudfront.net"
    
    # Health check staging
    if curl -f -s "$STAGING_URL" > /dev/null 2>&1; then
        success "Staging environment verified and healthy"
    else
        error "Staging environment is not healthy. Cannot proceed with production deployment."
        exit 1
    fi
}

# Build the application
build_application() {
    log "Building frontend application for production..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci
    
    # Run linting
    log "Running linting..."
    npm run lint || {
        error "Linting failed. Production deployment requires clean code."
        exit 1
    }
    
    # Run tests
    log "Running tests..."
    npm run test:ci || {
        error "Tests failed. Production deployment requires passing tests."
        exit 1
    }
    
    # Build for production
    log "Building application for production..."
    export NEXT_PUBLIC_API_URL="https://${CLOUDFRONT_ID}.cloudfront.net/api"
    export NEXT_PUBLIC_APP_NAME="ROIC分析アプリケーション"
    export NEXT_PUBLIC_APP_VERSION="$(date +%Y.%m.%d)"
    export NEXT_PUBLIC_ENVIRONMENT="production"
    
    npm run build
    
    success "Application built successfully"
}

# Create comprehensive backup
create_backup() {
    log "Creating comprehensive backup of current production deployment..."
    
    BACKUP_PREFIX="backup/$(date +%Y%m%d_%H%M%S)"
    
    # Check if bucket has content to backup
    if aws s3 ls "s3://$S3_BUCKET/" --region "$AWS_REGION" &> /dev/null; then
        log "Creating full backup..."
        aws s3 sync "s3://$S3_BUCKET/" "s3://$S3_BUCKET/$BACKUP_PREFIX/" \
            --region "$AWS_REGION" \
            --exclude "backup/*" || {
            error "Backup creation failed. Cannot proceed without backup."
            exit 1
        }
        
        # Also create a quick restore point
        aws s3 sync "s3://$S3_BUCKET/" "s3://$S3_BUCKET/backup/latest/" \
            --region "$AWS_REGION" \
            --exclude "backup/*" \
            --delete || true
        
        success "Backup created at s3://$S3_BUCKET/$BACKUP_PREFIX/"
    else
        log "No existing content to backup"
    fi
}

# Deploy to S3 with blue-green strategy
deploy_to_s3() {
    log "Deploying to S3 production environment..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Deploy with optimized cache headers
    log "Uploading static assets..."
    aws s3 sync out/ "s3://$S3_BUCKET/" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --exclude "*.html" \
        --exclude "*.json" \
        --exclude "*.xml" \
        --exclude "*.txt"
    
    # Upload HTML and dynamic files with shorter cache
    log "Uploading HTML and dynamic files..."
    aws s3 sync out/ "s3://$S3_BUCKET/" \
        --region "$AWS_REGION" \
        --cache-control "public, max-age=0, must-revalidate" \
        --include "*.html" \
        --include "*.json" \
        --include "*.xml" \
        --include "*.txt"
    
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
    
    # Wait for invalidation to complete for production
    log "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id "$CLOUDFRONT_ID" \
        --id "$INVALIDATION_ID" \
        --region "$AWS_REGION"
    
    success "Invalidation completed"
}

# Comprehensive health check
comprehensive_health_check() {
    log "Performing comprehensive production health check..."
    
    PRODUCTION_URL="https://${CLOUDFRONT_ID}.cloudfront.net"
    MAX_ATTEMPTS=15
    WAIT_TIME=20
    
    for i in $(seq 1 $MAX_ATTEMPTS); do
        log "Health check attempt $i/$MAX_ATTEMPTS..."
        
        # Basic connectivity check
        if curl -f -s "$PRODUCTION_URL" > /dev/null 2>&1; then
            # Additional checks
            log "Basic health check passed, running additional checks..."
            
            # Check response time
            RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$PRODUCTION_URL")
            log "Response time: ${RESPONSE_TIME}s"
            
            # Check if it's actually serving the new content
            if curl -s "$PRODUCTION_URL" | grep -q "ROIC分析アプリケーション" 2>/dev/null; then
                success "Comprehensive health check passed! Production environment is live at: $PRODUCTION_URL"
                return 0
            else
                warning "Content check failed (attempt $i/$MAX_ATTEMPTS)"
            fi
        else
            warning "Basic health check failed (attempt $i/$MAX_ATTEMPTS)"
        fi
        
        if [ $i -lt $MAX_ATTEMPTS ]; then
            log "Waiting ${WAIT_TIME} seconds before retry..."
            sleep $WAIT_TIME
        fi
    done
    
    error "Comprehensive health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

# Emergency rollback function
emergency_rollback() {
    error "PRODUCTION DEPLOYMENT FAILED. Initiating emergency rollback..."
    
    # Restore from latest backup
    if aws s3 ls "s3://$S3_BUCKET/backup/latest/" --region "$AWS_REGION" &> /dev/null; then
        log "Rolling back to latest backup..."
        
        aws s3 sync "s3://$S3_BUCKET/backup/latest/" "s3://$S3_BUCKET/" \
            --region "$AWS_REGION" \
            --delete \
            --exclude "backup/*"
        
        # Invalidate CloudFront cache
        ROLLBACK_INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_ID" \
            --paths "/*" \
            --region "$AWS_REGION" \
            --query 'Invalidation.Id' \
            --output text)
        
        log "Waiting for rollback invalidation to complete..."
        aws cloudfront wait invalidation-completed \
            --distribution-id "$CLOUDFRONT_ID" \
            --id "$ROLLBACK_INVALIDATION_ID" \
            --region "$AWS_REGION"
        
        # Verify rollback
        sleep 30
        if curl -f -s "https://${CLOUDFRONT_ID}.cloudfront.net" > /dev/null 2>&1; then
            success "Emergency rollback completed successfully"
        else
            error "Emergency rollback failed. Manual intervention required!"
        fi
    else
        error "No backup found for rollback. Manual intervention required!"
    fi
}

# Cleanup old backups (keep last 10 for production)
cleanup_backups() {
    log "Cleaning up old production backups..."
    
    # List backups and keep only the latest 10
    aws s3 ls "s3://$S3_BUCKET/backup/" --region "$AWS_REGION" | \
        grep "PRE" | grep -v "latest" | sort | head -n -10 | awk '{print $2}' | \
        while read -r backup_dir; do
            if [ -n "$backup_dir" ]; then
                log "Removing old backup: $backup_dir"
                aws s3 rm "s3://$S3_BUCKET/backup/$backup_dir" --recursive --region "$AWS_REGION"
            fi
        done
    
    success "Backup cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    log "Sending deployment notification..."
    
    # Get SNS topic ARN from CloudFormation
    SNS_TOPIC_ARN=$(aws cloudformation describe-stacks \
        --stack-name "roic-infrastructure-${ENVIRONMENT}" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DeploymentNotificationTopicArn`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$SNS_TOPIC_ARN" ]; then
        aws sns publish \
            --topic-arn "$SNS_TOPIC_ARN" \
            --subject "ROIC Production Deployment - $status" \
            --message "$message" \
            --region "$AWS_REGION" || true
    fi
}

# Main deployment function
main() {
    log "🚀 Starting ROIC production deployment..."
    
    # Trap errors for emergency rollback
    trap 'emergency_rollback; send_notification "FAILED" "Production deployment failed and rollback was attempted."; exit 1' ERR
    
    check_prerequisites
    verify_staging
    get_stack_outputs
    build_application
    create_backup
    deploy_to_s3
    invalidate_cloudfront
    
    # Disable error trap for health check
    trap - ERR
    
    if comprehensive_health_check; then
        cleanup_backups
        success "🎉 PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
        log "Production URL: https://${CLOUDFRONT_ID}.cloudfront.net"
        send_notification "SUCCESS" "Production deployment completed successfully. URL: https://${CLOUDFRONT_ID}.cloudfront.net"
    else
        emergency_rollback
        send_notification "FAILED" "Production deployment failed health check and was rolled back."
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_DEPLOY="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [--force] [--help]"
            echo "  --force    Force deployment without staging verification"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Confirmation prompt unless forced
if [ "$FORCE_DEPLOY" != "true" ]; then
    echo -e "${YELLOW}⚠️  This will deploy to PRODUCTION environment.${NC}"
    echo -e "${YELLOW}   Make sure staging is tested and approved.${NC}"
    read -p "Continue with production deployment? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Production deployment cancelled by user."
        exit 0
    fi
fi

# Run main function
main