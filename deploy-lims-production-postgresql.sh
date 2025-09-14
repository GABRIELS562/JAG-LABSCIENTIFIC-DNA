#!/bin/bash

# JAG DNA Scientific LIMS - Production Deployment with PostgreSQL
# This script builds and deploys LIMS to Kubernetes with PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="production"
APP_NAME="lims"
IMAGE_NAME="lims-full"
IMAGE_TAG="latest"
REGISTRY="localhost:5000"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker."
        exit 1
    fi

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl."
        exit 1
    fi

    # Check if local registry is running
    if ! curl -f http://localhost:5000/v2/ >/dev/null 2>&1; then
        log_warning "Local registry not running. Starting registry..."
        docker run -d -p 5000:5000 --restart=always --name registry registry:2 || true
        sleep 5
    fi

    log_success "Prerequisites check completed"
}

build_application() {
    log_info "Building LIMS application..."

    # Clean previous builds
    log_info "Cleaning previous builds..."
    rm -rf dist/ || true
    docker rmi ${FULL_IMAGE_NAME} || true

    # Build Docker image using optimized Dockerfile
    log_info "Building Docker image with optimized production Dockerfile..."
    docker build \
        -f Dockerfile.production-optimized \
        -t ${FULL_IMAGE_NAME} \
        --build-arg NODE_ENV=production \
        .

    # Check image size
    IMAGE_SIZE=$(docker images ${FULL_IMAGE_NAME} --format "table {{.Size}}" | tail -n 1)
    log_info "Built image size: ${IMAGE_SIZE}"

    log_success "Application build completed"
}

push_image() {
    log_info "Pushing image to local registry..."

    docker push ${FULL_IMAGE_NAME}

    log_success "Image pushed to registry"
}

setup_kubernetes_namespace() {
    log_info "Setting up Kubernetes namespace..."

    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

    # Label namespace for network policies
    kubectl label namespace ${NAMESPACE} name=${NAMESPACE} --overwrite

    log_success "Namespace '${NAMESPACE}' is ready"
}

deploy_database() {
    log_info "Deploying PostgreSQL database..."

    # Check if PostgreSQL is already deployed
    if kubectl get statefulset postgresql -n ${NAMESPACE} >/dev/null 2>&1; then
        log_info "PostgreSQL already exists, checking status..."
        kubectl rollout status statefulset/postgresql -n ${NAMESPACE} --timeout=300s
    else
        log_info "Deploying new PostgreSQL instance..."

        # Apply only the PostgreSQL-related resources
        kubectl apply -f - <<EOF
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: lims-config
  namespace: ${NAMESPACE}
data:
  DB_HOST: "postgresql.${NAMESPACE}.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "limsdb"
  DB_USER: "lims_user"
  POSTGRES_HOST: "postgresql.${NAMESPACE}.svc.cluster.local"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "limsdb"
  POSTGRES_USER: "lims_user"
  NODE_ENV: "production"
  PORT: "3001"
  HOST: "0.0.0.0"
  SERVE_STATIC: "true"
  VITE_API_URL: ""
  DATABASE_POOL_MIN: "2"
  DATABASE_POOL_MAX: "20"
  DATABASE_ENABLE_LOGGING: "false"
  ENABLE_DEVOPS_FEATURES: "true"
  ENABLE_WORKFLOW_AUTOMATION: "true"
  ENABLE_METRICS: "true"
  ENABLE_HEALTH_CHECK: "true"
  TRUST_PROXY: "true"
  CORS_ORIGIN: "*"
  CORS_CREDENTIALS: "true"

---
apiVersion: v1
kind: Secret
metadata:
  name: lims-secrets
  namespace: ${NAMESPACE}
type: Opaque
data:
  DB_PASSWORD: bGltczIwMjRzZWN1cmU=
  POSTGRES_PASSWORD: bGltczIwMjRzZWN1cmU=
  JWT_SECRET: cHJvZHVjdGlvbi1qd3Qtc2VjcmV0LWNoYW5nZS1tZQ==
  SESSION_SECRET: cHJvZHVjdGlvbi1zZXNzaW9uLXNlY3JldC1jaGFuZ2UtbWU=
  ADMIN_PASSWORD: YWRtaW4yMDI0

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-config
  namespace: ${NAMESPACE}
data:
  postgresql.conf: |
    listen_addresses = '*'
    max_connections = 100
    shared_buffers = 128MB
    effective_cache_size = 512MB
    maintenance_work_mem = 64MB
    checkpoint_completion_target = 0.7
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 4MB
    min_wal_size = 1GB
    max_wal_size = 4GB
    max_worker_processes = 8
    max_parallel_workers_per_gather = 2
    max_parallel_workers = 8
    max_parallel_maintenance_workers = 2
    log_statement = 'none'
    log_min_duration_statement = 1000
    log_line_prefix = '%t [%p-%l] %q%u@%d '

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: ${NAMESPACE}
  labels:
    app: postgresql
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgresql
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: POSTGRES_DB
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: lims-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        - name: postgresql-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - sh
            - -c
            - pg_isready -U \$POSTGRES_USER -d \$POSTGRES_DB
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - pg_isready -U \$POSTGRES_USER -d \$POSTGRES_DB
          initialDelaySeconds: 15
          periodSeconds: 5
      volumes:
      - name: postgresql-config
        configMap:
          name: postgresql-config
  volumeClaimTemplates:
  - metadata:
      name: postgresql-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: ${NAMESPACE}
  labels:
    app: postgresql
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    name: postgresql
  selector:
    app: postgresql
EOF

        # Wait for PostgreSQL to be ready
        log_info "Waiting for PostgreSQL to be ready..."
        kubectl wait --for=condition=ready pod -l app=postgresql -n ${NAMESPACE} --timeout=300s
    fi

    log_success "PostgreSQL database is ready"
}

deploy_application() {
    log_info "Deploying LIMS application..."

    # Create runtime config
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: lims-runtime-config
  namespace: ${NAMESPACE}
data:
  .env: |
    NODE_ENV=production
    PORT=3001
    HOST=0.0.0.0
    SERVE_STATIC=true
    VITE_API_URL=
    TRUST_PROXY=true
    ENABLE_DEVOPS_FEATURES=true
    ENABLE_WORKFLOW_AUTOMATION=true
    ENABLE_METRICS=true
    ENABLE_HEALTH_CHECK=true
    DATABASE_POOL_MIN=2
    DATABASE_POOL_MAX=20
    DATABASE_ENABLE_LOGGING=false
    CORS_ORIGIN=*
    CORS_CREDENTIALS=true
EOF

    # Deploy application
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-app
  namespace: ${NAMESPACE}
  labels:
    app: lims
    component: application
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: lims
      component: application
  template:
    metadata:
      labels:
        app: lims
        component: application
    spec:
      initContainers:
      - name: wait-for-db
        image: postgres:15-alpine
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: DB_HOST
        - name: DB_PORT
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: DB_PORT
        - name: DB_USER
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: lims-secrets
              key: DB_PASSWORD
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: lims-config
              key: DB_NAME
        command:
        - sh
        - -c
        - |
          echo "⏳ Waiting for PostgreSQL to be ready..."
          until pg_isready -h \$DB_HOST -p \$DB_PORT -U \$DB_USER; do
            echo "PostgreSQL is unavailable - sleeping"
            sleep 2
          done
          echo "✅ PostgreSQL is ready!"
          PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME -c "SELECT 1;" || exit 1
          echo "✅ Database connection successful!"

      containers:
      - name: lims
        image: ${FULL_IMAGE_NAME}
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
        envFrom:
        - configMapRef:
            name: lims-config
        - secretRef:
            name: lims-secrets
        env:
        - name: KUBERNETES_SERVICE_HOST
          value: "kubernetes.default.svc.cluster.local"

        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"

        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 60
          periodSeconds: 30

        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10

        startupProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 20
          periodSeconds: 10
          failureThreshold: 10

        volumeMounts:
        - name: lims-logs
          mountPath: /app/backend/logs
        - name: lims-temp
          mountPath: /app/temp

      volumes:
      - name: lims-logs
        emptyDir:
          sizeLimit: 1Gi
      - name: lims-temp
        emptyDir:
          sizeLimit: 2Gi

      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000

---
apiVersion: v1
kind: Service
metadata:
  name: lims-service
  namespace: ${NAMESPACE}
  labels:
    app: lims
spec:
  type: NodePort
  selector:
    app: lims
    component: application
  ports:
  - name: http
    port: 3001
    targetPort: 3001
    nodePort: 30001
EOF

    # Wait for deployment to be ready
    log_info "Waiting for LIMS deployment to be ready..."
    kubectl rollout status deployment/lims-app -n ${NAMESPACE} --timeout=600s

    log_success "LIMS application deployed successfully"
}

test_deployment() {
    log_info "Testing deployment..."

    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=lims -n ${NAMESPACE} --timeout=300s

    # Test database connectivity
    log_info "Testing database connectivity..."
    DB_POD=$(kubectl get pod -l app=postgresql -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}")
    kubectl exec -n ${NAMESPACE} ${DB_POD} -- psql -U lims_user -d limsdb -c "SELECT version();" >/dev/null

    # Test application health
    log_info "Testing application health..."
    APP_POD=$(kubectl get pod -l app=lims -n ${NAMESPACE} -o jsonpath="{.items[0].metadata.name}")
    kubectl exec -n ${NAMESPACE} ${APP_POD} -- curl -f http://localhost:3001/health >/dev/null

    # Get service endpoint
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
    NODE_PORT=30001

    log_success "Deployment test completed successfully!"
    log_info "Application is accessible at: http://${NODE_IP}:${NODE_PORT}"
}

cleanup_old_resources() {
    log_info "Cleaning up old resources..."

    # Remove old images
    docker image prune -f

    log_success "Cleanup completed"
}

show_deployment_status() {
    echo ""
    echo "======================================"
    echo "🚀 LIMS Production Deployment Status"
    echo "======================================"
    echo ""

    log_info "Namespace: ${NAMESPACE}"
    log_info "Image: ${FULL_IMAGE_NAME}"

    echo ""
    log_info "Pod Status:"
    kubectl get pods -n ${NAMESPACE} -o wide

    echo ""
    log_info "Service Status:"
    kubectl get services -n ${NAMESPACE}

    echo ""
    log_info "Deployment Status:"
    kubectl get deployments -n ${NAMESPACE}

    echo ""
    log_info "StatefulSet Status:"
    kubectl get statefulsets -n ${NAMESPACE}

    # Get access URLs
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
    NODE_PORT=30001

    echo ""
    echo "======================================"
    echo "🌐 Access Information"
    echo "======================================"
    echo "Application URL: http://${NODE_IP}:${NODE_PORT}"
    echo "Health Check: http://${NODE_IP}:${NODE_PORT}/health"
    echo "API Test: http://${NODE_IP}:${NODE_PORT}/api/test"
    echo "Metrics: http://${NODE_IP}:${NODE_PORT}/metrics"
    echo ""

    log_success "Deployment completed successfully! 🎉"
}

# Main execution
main() {
    echo "🚀 Starting LIMS Production Deployment with PostgreSQL"
    echo "======================================================"

    check_prerequisites
    build_application
    push_image
    setup_kubernetes_namespace
    deploy_database
    deploy_application
    test_deployment
    cleanup_old_resources
    show_deployment_status

    echo ""
    log_success "LIMS production deployment with PostgreSQL completed successfully!"
    echo ""
    echo "🔧 Useful commands:"
    echo "  kubectl logs -f deployment/lims-app -n ${NAMESPACE}"
    echo "  kubectl logs -f statefulset/postgresql -n ${NAMESPACE}"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl describe pod <pod-name> -n ${NAMESPACE}"
    echo "  kubectl port-forward svc/lims-service 3001:3001 -n ${NAMESPACE}"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "build-only")
        check_prerequisites
        build_application
        push_image
        ;;
    "deploy-only")
        setup_kubernetes_namespace
        deploy_database
        deploy_application
        test_deployment
        show_deployment_status
        ;;
    "status")
        show_deployment_status
        ;;
    "cleanup")
        kubectl delete namespace ${NAMESPACE} --ignore-not-found=true
        docker rmi ${FULL_IMAGE_NAME} || true
        log_success "Cleanup completed"
        ;;
    *)
        main
        ;;
esac