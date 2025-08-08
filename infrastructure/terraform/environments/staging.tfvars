project_name = "coldcaller"
environment  = "staging"
aws_region   = "us-west-2"

# Database configuration
db_instance_class = "db.t3.micro"

# Redis configuration
redis_node_type = "cache.t3.micro"

# Domain configuration
domain_name = "staging.coldcaller.com"

# Monitoring
enable_monitoring = false

# Backups
backup_retention_days = 7