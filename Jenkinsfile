pipeline {
    agent any
    
    environment {
        REGISTRY = 'localhost:5000'
        IMAGE = 'lims-complete'
    }
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh '''
                    echo "Building LIMS image..."
                    docker build -t ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} -f Dockerfile.production-optimized .
                    docker tag ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} ${REGISTRY}/${IMAGE}:latest
                '''
            }
        }
        
        stage('Push to Registry') {
            steps {
                sh '''
                    echo "Pushing to registry..."
                    docker push ${REGISTRY}/${IMAGE}:${BUILD_NUMBER}
                    docker push ${REGISTRY}/${IMAGE}:latest
                '''
            }
        }
        
        stage('Deploy to K3s') {
            steps {
                sh '''
                    echo "Deploying to Kubernetes..."
                    kubectl set image deployment/lims-complete lims-complete=${REGISTRY}/${IMAGE}:${BUILD_NUMBER} -n production
                    kubectl rollout status deployment/lims-complete -n production
                '''
            }
        }
        
        stage('Trigger ArgoCD Sync') {
            steps {
                sh '''
                    echo "Syncing ArgoCD..."
                    kubectl patch application lims-app -n argocd --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}' || true
                '''
            }
        }
    }
}
