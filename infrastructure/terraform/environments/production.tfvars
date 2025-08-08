project_name = "coldcaller"
environment  = "production"
aws_region   = "us-west-2"

# Database configuration
db_instance_class = "db.t3.small"

# Redis configuration  
redis_node_type = "cache.t3.small"

# Domain configuration
domain_name = "coldcaller.com"

# Monitoring
enable_monitoring = true

# Backups
backup_retention_days = 30

# Note: Sensitive variables (passwords, tokens) should be set via:
# - Environment variables: TF_VAR_db_password, TF_VAR_redis_auth_token
# - Terraform Cloud/Enterprise variables
# - AWS Secrets Manager (with data sources)
# - Never commit secrets to version control!