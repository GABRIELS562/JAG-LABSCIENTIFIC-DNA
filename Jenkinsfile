pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'localhost:5000'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        KUBECONFIG = credentials('kubeconfig')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                script {
                    dir('backend') {
                        sh 'docker build -t ${DOCKER_REGISTRY}/lims-backend:${IMAGE_TAG} .'
                        sh 'docker build -t ${DOCKER_REGISTRY}/lims-backend:latest .'
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    sh 'docker build -f frontend/Dockerfile -t ${DOCKER_REGISTRY}/lims-frontend:${IMAGE_TAG} .'
                    sh 'docker build -f frontend/Dockerfile -t ${DOCKER_REGISTRY}/lims-frontend:latest .'
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    sh 'docker push ${DOCKER_REGISTRY}/lims-backend:${IMAGE_TAG}'
                    sh 'docker push ${DOCKER_REGISTRY}/lims-backend:latest'
                    sh 'docker push ${DOCKER_REGISTRY}/lims-frontend:${IMAGE_TAG}'
                    sh 'docker push ${DOCKER_REGISTRY}/lims-frontend:latest'
                }
            }
        }

        stage('Update K8s Manifests') {
            steps {
                script {
                    sh """
                        sed -i 's|image: localhost:5000/lims-backend:.*|image: localhost:5000/lims-backend:${IMAGE_TAG}|g' k8s/backend.yaml
                        sed -i 's|image: localhost:5000/lims-frontend:.*|image: localhost:5000/lims-frontend:${IMAGE_TAG}|g' k8s/frontend.yaml
                    """
                }
            }
        }

        stage('Commit and Push') {
            steps {
                script {
                    sh """
                        git config --global user.email "jenkins@lims.local"
                        git config --global user.name "Jenkins CI"
                        git add k8s/backend.yaml k8s/frontend.yaml
                        git commit -m "Update image tags to ${IMAGE_TAG}" || echo "No changes to commit"
                        git push origin main || echo "Push failed, continuing..."
                    """
                }
            }
        }

        stage('Deploy to K8s') {
            steps {
                script {
                    sh """
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/postgres.yaml
                        kubectl apply -f k8s/backend.yaml
                        kubectl apply -f k8s/frontend.yaml
                        kubectl apply -f k8s/ingress.yaml
                        kubectl rollout status deployment/lims-backend -n lims --timeout=300s
                        kubectl rollout status deployment/lims-frontend -n lims --timeout=300s
                    """
                }
            }
        }

        stage('Sync ArgoCD') {
            steps {
                script {
                    sh """
                        argocd app sync lims --force || echo "ArgoCD sync failed, continuing..."
                        argocd app wait lims --timeout 300 || echo "ArgoCD wait failed, continuing..."
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline completed successfully"
        }
        failure {
            echo "Pipeline failed"
        }
    }
}
