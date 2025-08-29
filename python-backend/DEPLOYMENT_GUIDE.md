# Plataforma FastAPI Backend - Deployment Guide

This guide provides comprehensive instructions for deploying the Plataforma FastAPI Backend using Docker and Kubernetes in production environments.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

## Overview

This deployment setup provides:

- **Production-ready Docker containers** with multi-stage builds and security hardening
- **Kubernetes manifests** for scalable, highly available deployments
- **Automated CI/CD pipeline** with testing, security scanning, and deployment
- **Comprehensive monitoring** with Prometheus and Grafana
- **Backup and recovery** scripts for data protection
- **Security hardening** with best practices implemented

## Prerequisites

### System Requirements

- **Docker**: 20.10+ with BuildKit support
- **Kubernetes**: 1.25+ cluster with ingress controller
- **kubectl**: Compatible with your cluster version
- **Helm** (optional): 3.0+ for package management

### External Services

- **PostgreSQL**: 15+ (can be deployed as part of the stack)
- **Redis**: 7+ (can be deployed as part of the stack)
- **Container Registry**: Docker Hub, GitHub Container Registry, or private registry

### Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd plataforma.pyt/python-backend

# Make scripts executable
chmod +x deploy/*.sh
```

## Docker Deployment

### Local Development

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Compose

```bash
# Copy environment template
cp .env.example .env.prod

# Edit environment variables
nano .env.prod

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f
```

### Building Production Image

```bash
# Build production image
docker build -f Dockerfile.prod --target production -t plataforma-fastapi:latest .

# Build with metadata
docker build -f Dockerfile.prod --target production \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  --build-arg VERSION=1.0.0 \
  -t plataforma-fastapi:1.0.0 .
```

## Kubernetes Deployment

### Prerequisites

```bash
# Verify cluster connection
kubectl cluster-info

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Verify namespace
kubectl get namespaces
```

### Configure Secrets

**Important**: Update secrets with your actual values before deployment.

```bash
# Create secrets manually (recommended for production)
kubectl create secret generic fastapi-secrets \
  --from-literal=SECRET_KEY='your-secret-key-here' \
  --from-literal=JWT_SECRET_KEY='your-jwt-secret-key-here' \
  --from-literal=SESSION_SECRET_KEY='your-session-secret-key-here' \
  --namespace=plataforma-fastapi

kubectl create secret generic postgres-secrets \
  --from-literal=POSTGRES_PASSWORD='your-postgres-password-here' \
  --namespace=plataforma-fastapi

kubectl create secret generic redis-secrets \
  --from-literal=REDIS_PASSWORD='your-redis-password-here' \
  --namespace=plataforma-fastapi

# Or apply the secrets file (after editing)
kubectl apply -f k8s/secrets.yaml
```

### Deploy Services

```bash
# Deploy in order
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/fastapi.yaml
kubectl apply -f k8s/ingress.yaml

# Verify deployment
kubectl get all -n plataforma-fastapi
```

### Using Deployment Script

```bash
# Deploy to staging
./deploy/deploy.sh staging latest

# Deploy to production
./deploy/deploy.sh production v1.0.0

# Dry run deployment
DRY_RUN=true ./deploy/deploy.sh production v1.0.0
```

## CI/CD Pipeline

### GitHub Actions Setup

The CI/CD pipeline is configured in `.github/workflows/python-backend-ci.yml` and includes:

- **Code Quality**: Black, isort, flake8, mypy
- **Security Scanning**: Bandit, safety, CodeQL, Trivy
- **Testing**: Pytest with coverage reporting
- **Building**: Multi-platform Docker images
- **Deployment**: Automated deployment to staging/production

### Required Secrets

Configure these secrets in your GitHub repository:

```bash
# Container registry
GITHUB_TOKEN  # Automatically provided

# Kubernetes clusters
STAGING_KUBE_CONFIG    # Base64 encoded kubeconfig
PRODUCTION_KUBE_CONFIG # Base64 encoded kubeconfig

# Notifications (optional)
SLACK_WEBHOOK_URL
```

### Pipeline Triggers

- **Push to main**: Deploy to production
- **Push to develop**: Deploy to staging  
- **Pull requests**: Run tests and security scans
- **Release tags**: Create GitHub release

## Monitoring and Logging

### Prometheus Metrics

The application exposes metrics at `/metrics`:

- HTTP request metrics
- Database connection pool metrics
- Custom business metrics
- System resource metrics

### Grafana Dashboards

Pre-configured dashboards are available in `monitoring/grafana/dashboards/`:

- FastAPI application dashboard
- Database performance dashboard
- Infrastructure overview dashboard

### Alerting Rules

Alert rules are defined in `monitoring/alert-rules.yml`:

- Application health alerts
- Performance alerts
- Security alerts
- Infrastructure alerts

### Setup Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f k8s/prometheus.yaml

# Deploy Grafana
kubectl apply -f k8s/grafana.yaml

# Access Grafana (port-forward for testing)
kubectl port-forward svc/grafana 3000:3000 -n plataforma-fastapi
# Open http://localhost:3000 (admin/admin)
```

## Backup and Recovery

### Automated Backups

```bash
# Backup database
./deploy/backup.sh production database

# Backup all data
./deploy/backup.sh production all

# Backup with custom retention
RETENTION_DAYS=30 ./deploy/backup.sh production database
```

### Scheduled Backups

Create a CronJob for automated backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-cronjob
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: plataforma-fastapi:latest
            command: ["/app/deploy/backup.sh", "production", "all"]
```

### Recovery Process

```bash
# List available backups
ls -la backups/

# Restore database
./deploy/restore.sh staging /path/to/backup.sql.gz database

# Restore all data (with confirmation)
./deploy/restore.sh production /path/to/backup.tar.gz all
```

## Security Considerations

### Container Security

- ✅ Non-root user in containers
- ✅ Read-only filesystem where possible
- ✅ Security context and capabilities
- ✅ Regular base image updates
- ✅ Vulnerability scanning with Trivy

### Network Security

- ✅ Network policies for pod-to-pod communication
- ✅ TLS encryption for all external communication
- ✅ Ingress controller with WAF capabilities
- ✅ Rate limiting and DDoS protection

### Secrets Management

- ✅ Kubernetes secrets for sensitive data
- ✅ External secret management integration (recommended)
- ✅ Secret rotation procedures
- ✅ Audit logging for secret access

### RBAC and Access Control

- ✅ Role-based access control (RBAC)
- ✅ Service account with minimal permissions
- ✅ Pod security policies/standards
- ✅ Audit logging enabled

## Troubleshooting

### Common Issues

#### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n plataforma-fastapi

# Check logs
kubectl logs <pod-name> -n plataforma-fastapi

# Check events
kubectl get events -n plataforma-fastapi --sort-by=.metadata.creationTimestamp
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it <fastapi-pod> -n plataforma-fastapi -- \
  python -c "
import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://user:pass@postgres:5432/db')
    print('Connection successful')
    await conn.close()

asyncio.run(test())
"
```

#### Health Check Failures

```bash
# Check health endpoint directly
kubectl port-forward svc/fastapi-service 8000:8000 -n plataforma-fastapi
curl http://localhost:8000/health

# Check detailed health
curl http://localhost:8000/health/detailed
```

### Performance Issues

#### High Response Times

1. Check database query performance
2. Review connection pool settings
3. Analyze slow query logs
4. Check resource limits and usage

#### Memory Issues

```bash
# Check memory usage
kubectl top pods -n plataforma-fastapi

# Adjust memory limits
kubectl patch deployment fastapi-deployment -n plataforma-fastapi -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"fastapi","resources":{"limits":{"memory":"4Gi"}}}]}}}}'
```

### Getting Help

1. **Check logs**: Always start with application and system logs
2. **Monitor metrics**: Use Grafana dashboards to identify patterns
3. **Review documentation**: Check FastAPI and dependency documentation
4. **Community support**: FastAPI Discord, GitHub issues

## Maintenance

### Regular Tasks

- **Security updates**: Update base images monthly
- **Dependency updates**: Update Python dependencies regularly
- **Backup verification**: Test restore procedures quarterly
- **Performance tuning**: Review metrics and optimize quarterly
- **Documentation**: Keep deployment docs up to date

### Scaling

#### Horizontal Scaling

```bash
# Scale API pods
kubectl scale deployment fastapi-deployment --replicas=5 -n plataforma-fastapi

# Auto-scaling is configured via HPA
kubectl get hpa -n plataforma-fastapi
```

#### Vertical Scaling

```bash
# Update resource limits
kubectl patch deployment fastapi-deployment -n plataforma-fastapi -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"fastapi","resources":{"limits":{"cpu":"2000m","memory":"4Gi"}}}]}}}}'
```

---

For additional support or questions, please refer to the project documentation or create an issue in the repository.