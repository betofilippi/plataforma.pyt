# Makefile for Plataforma NXT Backend
# Usage: make <command>

# ================================
# VARIABLES
# ================================
PYTHON := python
PIP := pip
UVICORN := uvicorn
PYTEST := pytest
ALEMBIC := alembic
CELERY := celery
DOCKER := docker
DOCKER_COMPOSE := docker-compose

# Project settings
PROJECT_NAME := plataforma-backend
VENV_DIR := .venv
APP_MODULE := app.main:app

# Colors for output
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
BOLD := \033[1m
RESET := \033[0m

# ================================
# HELP
# ================================
.PHONY: help
help: ## Show this help message
	@echo "$(BOLD)$(PROJECT_NAME) - FastAPI Backend$(RESET)"
	@echo ""
	@echo "$(BOLD)Available commands:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ================================
# ENVIRONMENT SETUP
# ================================
.PHONY: install
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"
	@echo "$(GREEN)Dependencies installed successfully!$(RESET)"

.PHONY: install-prod
install-prod: ## Install production dependencies only
	@echo "$(BLUE)Installing production dependencies...$(RESET)"
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[production]"
	@echo "$(GREEN)Production dependencies installed!$(RESET)"

.PHONY: venv
venv: ## Create virtual environment
	@echo "$(BLUE)Creating virtual environment...$(RESET)"
	$(PYTHON) -m venv $(VENV_DIR)
	@echo "$(GREEN)Virtual environment created!$(RESET)"
	@echo "$(YELLOW)Activate with: source $(VENV_DIR)/bin/activate (Linux/Mac) or $(VENV_DIR)\\Scripts\\activate (Windows)$(RESET)"

.PHONY: setup
setup: venv install ## Full setup: create venv and install dependencies
	@echo "$(GREEN)Setup complete!$(RESET)"

# ================================
# DEVELOPMENT
# ================================
.PHONY: dev
dev: ## Run development server
	@echo "$(BLUE)Starting development server...$(RESET)"
	$(UVICORN) $(APP_MODULE) --reload --host 0.0.0.0 --port 8000

.PHONY: dev-debug
dev-debug: ## Run development server with debug logging
	@echo "$(BLUE)Starting development server with debug logging...$(RESET)"
	LOG_LEVEL=DEBUG $(UVICORN) $(APP_MODULE) --reload --host 0.0.0.0 --port 8000

.PHONY: shell
shell: ## Start interactive Python shell with app context
	@echo "$(BLUE)Starting Python shell...$(RESET)"
	$(PYTHON) -c "from app.main import app; from app.core.database import get_db; import asyncio"

# ================================
# CODE QUALITY
# ================================
.PHONY: format
format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(RESET)"
	black .
	isort .
	@echo "$(GREEN)Code formatted!$(RESET)"

.PHONY: lint
lint: ## Run linting checks
	@echo "$(BLUE)Running linting checks...$(RESET)"
	flake8 app/ tests/
	@echo "$(GREEN)Linting passed!$(RESET)"

.PHONY: type-check
type-check: ## Run type checking with mypy
	@echo "$(BLUE)Running type checks...$(RESET)"
	mypy app/
	@echo "$(GREEN)Type checking passed!$(RESET)"

.PHONY: security
security: ## Run security checks with bandit
	@echo "$(BLUE)Running security checks...$(RESET)"
	bandit -r app/
	@echo "$(GREEN)Security checks passed!$(RESET)"

.PHONY: check
check: format lint type-check security ## Run all code quality checks
	@echo "$(GREEN)All quality checks passed!$(RESET)"

.PHONY: pre-commit
pre-commit: ## Run pre-commit hooks on all files
	@echo "$(BLUE)Running pre-commit hooks...$(RESET)"
	pre-commit run --all-files
	@echo "$(GREEN)Pre-commit checks passed!$(RESET)"

# ================================
# TESTING
# ================================
.PHONY: test
test: ## Run tests
	@echo "$(BLUE)Running tests...$(RESET)"
	$(PYTEST)

.PHONY: test-cov
test-cov: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	$(PYTEST) --cov=app --cov-report=html --cov-report=term

.PHONY: test-fast
test-fast: ## Run fast tests only (exclude slow tests)
	@echo "$(BLUE)Running fast tests...$(RESET)"
	$(PYTEST) -m "not slow"

.PHONY: test-unit
test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(RESET)"
	$(PYTEST) -m "unit"

.PHONY: test-integration
test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(RESET)"
	$(PYTEST) -m "integration"

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(RESET)"
	$(PYTEST) -f

# ================================
# DATABASE
# ================================
.PHONY: db-upgrade
db-upgrade: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(RESET)"
	$(ALEMBIC) upgrade head
	@echo "$(GREEN)Database upgraded!$(RESET)"

.PHONY: db-downgrade
db-downgrade: ## Rollback last migration
	@echo "$(YELLOW)Rolling back last migration...$(RESET)"
	$(ALEMBIC) downgrade -1
	@echo "$(GREEN)Database downgraded!$(RESET)"

.PHONY: db-revision
db-revision: ## Create new migration (requires MESSAGE variable)
	@echo "$(BLUE)Creating new migration...$(RESET)"
	$(ALEMBIC) revision --autogenerate -m "$(MESSAGE)"
	@echo "$(GREEN)Migration created!$(RESET)"

.PHONY: db-history
db-history: ## Show migration history
	@echo "$(BLUE)Migration history:$(RESET)"
	$(ALEMBIC) history --verbose

.PHONY: db-current
db-current: ## Show current migration
	@echo "$(BLUE)Current migration:$(RESET)"
	$(ALEMBIC) current

.PHONY: db-reset
db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)WARNING: This will destroy all data!$(RESET)"
	@read -p "Are you sure? [y/N]: " confirm && [ "$$confirm" = "y" ]
	$(ALEMBIC) downgrade base
	$(ALEMBIC) upgrade head
	@echo "$(GREEN)Database reset!$(RESET)"

# ================================
# BACKGROUND TASKS
# ================================
.PHONY: worker
worker: ## Start Celery worker
	@echo "$(BLUE)Starting Celery worker...$(RESET)"
	$(CELERY) -A app.tasks.celery_app worker --loglevel=info

.PHONY: beat
beat: ## Start Celery beat scheduler
	@echo "$(BLUE)Starting Celery beat scheduler...$(RESET)"
	$(CELERY) -A app.tasks.celery_app beat --loglevel=info

.PHONY: flower
flower: ## Start Flower monitoring
	@echo "$(BLUE)Starting Flower monitoring...$(RESET)"
	$(CELERY) -A app.tasks.celery_app flower

# ================================
# DOCKER
# ================================
.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(RESET)"
	$(DOCKER) build -t $(PROJECT_NAME):latest .
	@echo "$(GREEN)Docker image built!$(RESET)"

.PHONY: docker-up
docker-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting services with Docker Compose...$(RESET)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services started!$(RESET)"

.PHONY: docker-down
docker-down: ## Stop services with Docker Compose
	@echo "$(BLUE)Stopping services...$(RESET)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)Services stopped!$(RESET)"

.PHONY: docker-logs
docker-logs: ## Show Docker Compose logs
	$(DOCKER_COMPOSE) logs -f

.PHONY: docker-clean
docker-clean: ## Clean Docker resources
	@echo "$(BLUE)Cleaning Docker resources...$(RESET)"
	$(DOCKER) system prune -f
	@echo "$(GREEN)Docker resources cleaned!$(RESET)"

# ================================
# PRODUCTION
# ================================
.PHONY: prod
prod: ## Run production server with Gunicorn
	@echo "$(BLUE)Starting production server...$(RESET)"
	gunicorn $(APP_MODULE) -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

.PHONY: prod-setup
prod-setup: install-prod db-upgrade ## Setup production environment
	@echo "$(GREEN)Production environment setup complete!$(RESET)"

# ================================
# CLEANUP
# ================================
.PHONY: clean
clean: ## Clean temporary files
	@echo "$(BLUE)Cleaning temporary files...$(RESET)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	find . -type d -name ".mypy_cache" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "htmlcov" -delete
	@echo "$(GREEN)Cleanup complete!$(RESET)"

.PHONY: clean-all
clean-all: clean ## Clean everything including venv
	@echo "$(BLUE)Cleaning everything...$(RESET)"
	rm -rf $(VENV_DIR)
	@echo "$(GREEN)Full cleanup complete!$(RESET)"

# ================================
# DOCUMENTATION
# ================================
.PHONY: docs
docs: ## Generate API documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	@echo "$(YELLOW)API documentation available at: http://localhost:8000/docs$(RESET)"
	@echo "$(YELLOW)Alternative docs at: http://localhost:8000/redoc$(RESET)"

# ================================
# UTILITIES
# ================================
.PHONY: check-deps
check-deps: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(RESET)"
	$(PIP) list --outdated

.PHONY: update-deps
update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	$(PIP) install --upgrade -r requirements.txt
	@echo "$(GREEN)Dependencies updated!$(RESET)"

# Set default target
.DEFAULT_GOAL := help