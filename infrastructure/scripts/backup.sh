#!/bin/bash

# Automated backup script for Coldcaller application
# This script performs database backups, file backups, and uploads to S3

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="coldcaller_db_${TIMESTAMP}.sql"
REDIS_BACKUP_FILE="coldcaller_redis_${TIMESTAMP}.rdb"
FILES_BACKUP_FILE="coldcaller_files_${TIMESTAMP}.tar.gz"

# S3 Configuration (from environment variables)
S3_BUCKET="${BACKUP_S3_BUCKET:-coldcaller-backups}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Database Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-coldcaller}"
DB_USER="${DB_USER:-postgres}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Retention settings
LOCAL_RETENTION_DAYS=7
S3_RETENTION_DAYS=30

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
backup_database() {
    log "Starting database backup..."
    
    if ! pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password --verbose --clean --if-exists --create \
        > "$BACKUP_DIR/$DB_BACKUP_FILE"; then
        error "Database backup failed"
    fi
    
    # Compress the backup
    gzip "$BACKUP_DIR/$DB_BACKUP_FILE"
    DB_BACKUP_FILE="${DB_BACKUP_FILE}.gz"
    
    log "Database backup completed: $DB_BACKUP_FILE"
}

# Redis backup
backup_redis() {
    log "Starting Redis backup..."
    
    # Create Redis backup using SAVE command
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/$REDIS_BACKUP_FILE"
    
    if [[ -f "$BACKUP_DIR/$REDIS_BACKUP_FILE" ]]; then
        gzip "$BACKUP_DIR/$REDIS_BACKUP_FILE"
        REDIS_BACKUP_FILE="${REDIS_BACKUP_FILE}.gz"
        log "Redis backup completed: $REDIS_BACKUP_FILE"
    else
        log "WARNING: Redis backup file not created"
    fi
}

# File system backup (uploads, logs, etc.)
backup_files() {
    log "Starting file system backup..."
    
    # Backup uploads directory
    if [[ -d "/backup/uploads" ]]; then
        tar -czf "$BACKUP_DIR/$FILES_BACKUP_FILE" -C /backup uploads/
        log "Files backup completed: $FILES_BACKUP_FILE"
    else
        log "WARNING: Uploads directory not found, skipping files backup"
    fi
}

# Upload to S3
upload_to_s3() {
    log "Uploading backups to S3..."
    
    local files=("$DB_BACKUP_FILE" "$REDIS_BACKUP_FILE" "$FILES_BACKUP_FILE")
    
    for file in "${files[@]}"; do
        if [[ -f "$BACKUP_DIR/$file" ]]; then
            if aws s3 cp "$BACKUP_DIR/$file" "s3://$S3_BUCKET/backups/$(date +%Y/%m/%d)/$file" \
                --region "$AWS_REGION" \
                --storage-class STANDARD_IA; then
                log "Uploaded $file to S3"
            else
                log "WARNING: Failed to upload $file to S3"
            fi
        fi
    done
}

# Cleanup old local backups
cleanup_local() {
    log "Cleaning up old local backups..."
    
    find "$BACKUP_DIR" -name "coldcaller_*" -type f -mtime +$LOCAL_RETENTION_DAYS -delete
    
    log "Local cleanup completed"
}

# Cleanup old S3 backups
cleanup_s3() {
    log "Cleaning up old S3 backups..."
    
    # Calculate date for retention
    local cutoff_date
    cutoff_date=$(date -d "$S3_RETENTION_DAYS days ago" +%Y-%m-%d)
    
    # List and delete old backups
    aws s3api list-objects-v2 \
        --bucket "$S3_BUCKET" \
        --prefix "backups/" \
        --query "Contents[?LastModified<='$cutoff_date'].{Key: Key}" \
        --output text | \
    while read -r key; do
        if [[ -n "$key" && "$key" != "None" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$key"
            log "Deleted old backup: $key"
        fi
    done
    
    log "S3 cleanup completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if backups exist and have reasonable size
    local min_size=1024  # 1KB minimum
    
    for file in "$DB_BACKUP_FILE" "$REDIS_BACKUP_FILE" "$FILES_BACKUP_FILE"; do
        if [[ -f "$BACKUP_DIR/$file" ]]; then
            local size
            size=$(stat -c%s "$BACKUP_DIR/$file")
            if [[ $size -lt $min_size ]]; then
                log "WARNING: $file is smaller than expected ($size bytes)"
            else
                log "✓ $file backup is valid ($size bytes)"
            fi
        fi
    done
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # You can implement notification logic here (Slack, email, etc.)
    log "NOTIFICATION [$status]: $message"
    
    # Example Slack webhook (uncomment and configure)
    # if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"Coldcaller Backup [$status]: $message\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# Main backup function
main() {
    log "Starting backup process..."
    
    local start_time
    start_time=$(date +%s)
    
    # Set PGPASSWORD for non-interactive backup
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Perform backups
    backup_database
    backup_redis
    backup_files
    
    # Upload to S3 if configured
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3
        cleanup_s3
    else
        log "S3 configuration not found, skipping S3 operations"
    fi
    
    # Cleanup and health check
    cleanup_local
    health_check
    
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    log "Backup process completed in ${duration} seconds"
    send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
}

# Error handling
trap 'send_notification "FAILED" "Backup process failed with error"; exit 1' ERR

# Run main function
main "$@"