# Deployment Guide

Complete guide for deploying Plataforma.dev to production environments, including cloud platforms, containerization, and best practices.

## 📋 Table of Contents

- [Deployment Options](#deployment-options)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Platform Deployments](#cloud-platform-deployments)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## 🚀 Deployment Options

### 1. Single Server Deployment
**Best for**: Small teams, development, staging
- Single server with all components
- Docker Compose orchestration
- Local PostgreSQL database
- Basic monitoring

### 2. Containerized Deployment
**Best for**: Medium teams, scalable production
- Docker containers
- Container orchestration (Docker Swarm/Kubernetes)
- External database service
- Load balancing and auto-scaling

### 3. Cloud Native Deployment
**Best for**: Large teams, enterprise production
- Cloud platform services (AWS, GCP, Azure)
- Managed databases and storage
- CDN integration
- Advanced monitoring and security

### 4. Hybrid Deployment
**Best for**: Regulated industries, data sovereignty
- On-premise core services
- Cloud services for scaling
- Edge deployment for performance
- Custom security requirements

## 📋 Prerequisites

### System Requirements

**Minimum Requirements**:
- CPU: 2 vCPU cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 1Gbps
- OS: Ubuntu 20.04+, CentOS 8+, or Docker support

**Recommended Requirements**:
- CPU: 4+ vCPU cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- Network: 10Gbps
- Load balancer support

### Software Dependencies

- **Docker**: 20.10+ and Docker Compose 2.0+
- **Node.js**: 18.0+ (if building from source)
- **PostgreSQL**: 13+ (can be external service)
- **Redis**: 6.0+ (optional, for caching)
- **Nginx**: Latest (for reverse proxy)

### Network Requirements

- **Ports**:
  - `80/443`: HTTP/HTTPS traffic
  - `3030`: Application server
  - `4000`: API server
  - `5432`: PostgreSQL (if local)
  - `6379`: Redis (if local)

## ⚙️ Environment Configuration

### Production Environment Variables

Create a `.env.production` file:

```env
# Application
NODE_ENV=production
PORT=3030
API_PORT=4000
DOMAIN=your-domain.com

# Security
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=1000

# Database
DATABASE_URL=postgresql://username:password@db-host:5432/plataforma_prod
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_SSL=true

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=your-redis-password

# Storage
STORAGE_PROVIDER=supabase
# or for S3:
# STORAGE_PROVIDER=s3
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_BUCKET=your-bucket-name
# AWS_REGION=us-east-1

# Email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENABLED=true

# Features
DEMO_MODE=false
REALTIME_ENABLED=true
MODULE_REGISTRY_URL=https://registry.plataforma.dev
```

### Security Configuration

```env
# Security Headers
HELMET_ENABLED=true
CSRF_ENABLED=true
CSP_ENABLED=true

# Session Security
SESSION_SECRET=your-session-secret-min-32-chars
SESSION_SECURE=true
SESSION_SAME_SITE=strict
SESSION_MAX_AGE=86400000

# API Security
API_KEY_REQUIRED=true
API_RATE_LIMIT=100
API_RATE_WINDOW=3600000

# SSL/TLS
SSL_REDIRECT=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
```

## 🐳 Docker Deployment

### Single Server with Docker Compose

**docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  app:
    image: plataforma/app:latest
    restart: always
    ports:
      - "3030:3030"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
    networks:
      - plataforma-network

  api:
    image: plataforma/api:latest
    restart: always
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    networks:
      - plataforma-network

  db:
    image: postgres:15
    restart: always
    environment:
      - POSTGRES_DB=plataforma_prod
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - plataforma-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - plataforma-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
      - api
    networks:
      - plataforma-network

volumes:
  postgres_data:
  redis_data:

networks:
  plataforma-network:
    driver: bridge
```

### Nginx Configuration

**nginx/nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3030;
    }
    
    upstream api {
        server api:4000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=app:10m rate=30r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

        # API Routes
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket for real-time
        location /ws {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Application
        location / {
            limit_req zone=app burst=50 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
        }
    }
}
```

### Deployment Commands

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale app=3 --scale api=2

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## ☸️ Kubernetes Deployment

### Namespace Configuration

**k8s/namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: plataforma-prod
  labels:
    name: plataforma-prod
```

### ConfigMap for Environment Variables

**k8s/configmap.yaml**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: plataforma-config
  namespace: plataforma-prod
data:
  NODE_ENV: "production"
  PORT: "3030"
  API_PORT: "4000"
  LOG_LEVEL: "info"
  REALTIME_ENABLED: "true"
```

### Secrets Configuration

**k8s/secrets.yaml**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: plataforma-secrets
  namespace: plataforma-prod
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret"
  DATABASE_URL: "postgresql://user:pass@db:5432/plataforma"
  REDIS_URL: "redis://redis:6379"
```

### Application Deployment

**k8s/app-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plataforma-app
  namespace: plataforma-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: plataforma-app
  template:
    metadata:
      labels:
        app: plataforma-app
    spec:
      containers:
      - name: app
        image: plataforma/app:latest
        ports:
        - containerPort: 3030
        envFrom:
        - configMapRef:
            name: plataforma-config
        - secretRef:
            name: plataforma-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3030
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3030
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Configuration

**k8s/service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: plataforma-app-service
  namespace: plataforma-prod
spec:
  selector:
    app: plataforma-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3030
  type: ClusterIP

---
apiVersion: v1
kind: Service
metadata:
  name: plataforma-api-service
  namespace: plataforma-prod
spec:
  selector:
    app: plataforma-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: ClusterIP
```

### Ingress Configuration

**k8s/ingress.yaml**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: plataforma-ingress
  namespace: plataforma-prod
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: plataforma-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: plataforma-api-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: plataforma-app-service
            port:
              number: 80
```

### Deployment Commands

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy applications
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml

# Create services
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n plataforma-prod
kubectl get services -n plataforma-prod

# Scale deployment
kubectl scale deployment plataforma-app --replicas=5 -n plataforma-prod
```

## ☁️ Cloud Platform Deployments

### AWS Deployment

**Using AWS ECS with Fargate**:

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name plataforma-prod

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster plataforma-prod \
  --service-name plataforma-app \
  --task-definition plataforma-app:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

**task-definition.json**:
```json
{
  "family": "plataforma-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "plataforma-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/plataforma:latest",
      "portMappings": [
        {
          "containerPort": 3030,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:plataforma/db"
        }
      ]
    }
  ]
}
```

### Google Cloud Platform

**Using Cloud Run**:

```bash
# Build and push image
gcloud builds submit --tag gcr.io/project-id/plataforma-app

# Deploy service
gcloud run deploy plataforma-app \
  --image gcr.io/project-id/plataforma-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3030 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

### Azure Container Instances

```bash
# Create resource group
az group create --name plataforma-prod --location eastus

# Create container instance
az container create \
  --resource-group plataforma-prod \
  --name plataforma-app \
  --image plataforma/app:latest \
  --cpu 1 --memory 2 \
  --ports 3030 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables DATABASE_URL=$DATABASE_URL
```

## 🗄️ Database Setup

### PostgreSQL Configuration

**For production PostgreSQL**:

```sql
-- Create database
CREATE DATABASE plataforma_prod;

-- Create application user
CREATE USER plataforma_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE plataforma_prod TO plataforma_user;

-- Configure connection limits
ALTER USER plataforma_user CONNECTION LIMIT 20;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### Supabase Configuration

If using Supabase as your database:

1. **Create Supabase Project**
2. **Configure Row Level Security (RLS)**:

```sql
-- Enable RLS on tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only see their data" 
  ON customers FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert their data" 
  ON customers FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);
```

3. **Configure Realtime**:
```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
```

### Database Migrations

**Production migration script**:
```bash
#!/bin/bash
# migrate-prod.sh

set -e

echo "Starting database migration..."

# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run db:migrate

echo "Migration completed successfully"
```

## 🔒 SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo tee -a /var/spool/cron/crontabs/root
```

### Manual SSL Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate signing request
openssl req -new -key private.key -out certificate.csr

# After receiving certificate from CA, combine with intermediate certificates
cat your_certificate.crt intermediate.crt > certificate_chain.crt
```

## 📊 Monitoring & Logging

### Prometheus Configuration

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'plataforma-app'
    static_configs:
      - targets: ['localhost:3030']
    metrics_path: '/metrics'

  - job_name: 'plataforma-api'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

### Grafana Dashboards

Import pre-built dashboards:
- Node.js Application Metrics
- PostgreSQL Database Metrics
- Redis Performance Metrics
- Nginx Web Server Metrics

### Log Aggregation with ELK Stack

**docker-compose.logging.yml**:
```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

## 💾 Backup & Recovery

### Database Backup Script

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="plataforma_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/${BACKUP_FILE}.gz s3://your-backup-bucket/database/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -type f -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Application Backup

```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup configuration files
tar -czf $BACKUP_DIR/config_${DATE}.tar.gz \
  docker-compose.prod.yml \
  .env.production \
  nginx/

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_${DATE}.tar.gz uploads/

# Upload to cloud storage
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/application/
```

### Recovery Procedures

```bash
# Database recovery
gunzip -c backup_file.sql.gz | psql $DATABASE_URL

# Application recovery
tar -xzf config_backup.tar.gz
tar -xzf uploads_backup.tar.gz
docker-compose -f docker-compose.prod.yml up -d
```

## ⚡ Performance Optimization

### Application Performance

```javascript
// Enable production optimizations
const config = {
  NODE_ENV: 'production',
  
  // Database connection pooling
  DATABASE_POOL_MIN: 2,
  DATABASE_POOL_MAX: 20,
  DATABASE_POOL_IDLE_TIMEOUT: 30000,
  
  // Redis caching
  REDIS_ENABLED: true,
  CACHE_TTL: 3600,
  
  // Compression
  COMPRESSION_ENABLED: true,
  COMPRESSION_LEVEL: 6,
  
  // Static file caching
  STATIC_CACHE_MAX_AGE: 31536000,
};
```

### Database Optimization

```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM customers WHERE status = 'active';

-- Update table statistics
ANALYZE customers;
ANALYZE sales;
```

### CDN Configuration

**CloudFlare settings**:
- Cache Level: Standard
- Browser Cache TTL: 1 year for static assets
- Always Online: Enabled
- Minification: HTML, CSS, JS
- Rocket Loader: Enabled

## 🔧 Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
docker-compose logs app

# Check environment variables
docker-compose exec app env

# Check port conflicts
netstat -tulpn | grep :3030
```

**2. Database connection issues**
```bash
# Test database connection
docker-compose exec app node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT NOW()').then(res => console.log(res.rows[0])).catch(console.error);
"

# Check database logs
docker-compose logs db
```

**3. High memory usage**
```bash
# Check container memory usage
docker stats

# Analyze memory leaks
docker-compose exec app node --expose-gc --inspect=0.0.0.0:9229 index.js
```

**4. SSL certificate issues**
```bash
# Check certificate expiry
openssl x509 -in certificate.crt -text -noout | grep "Not After"

# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Health Checks

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  };
  
  res.status(200).json(health);
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({ status: 'Ready' });
  } catch (error) {
    res.status(503).json({ status: 'Not Ready', error: error.message });
  }
});
```

### Performance Monitoring

```bash
# Monitor application metrics
curl http://localhost:3030/metrics

# Check database performance
docker-compose exec db psql -U postgres -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;
"

# Monitor system resources
htop
iotop
```

---

This deployment guide covers comprehensive production deployment scenarios for Plataforma.dev. For specific cloud platform optimizations or advanced configurations, consult the respective platform documentation or contact our support team.