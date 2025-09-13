pipeline {
    agent any
    
    environment {
        REGISTRY = 'localhost:5000'
        IMAGE = 'lims-full'
    }
    
    stages {
        stage('Build & Push') {
            steps {
                sh '''
                    docker build -t ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} -f Dockerfile.complete .
                    docker push ${REGISTRY}/${IMAGE}:${BUILD_NUMBER}
                    docker tag ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} ${REGISTRY}/${IMAGE}:latest
                    docker push ${REGISTRY}/${IMAGE}:latest
                '''
            }
        }
        
        stage('Update Manifest') {
            steps {
                sh '''
                    sed -i "s|image: .*|image: ${REGISTRY}/${IMAGE}:${BUILD_NUMBER}|g" k8s-lims-full.yaml
                    git config user.name "Jenkins"
                    git config user.email "jenkins@localhost"
                    git add k8s-lims-full.yaml
                    git commit -m "Update image to ${BUILD_NUMBER}" || true
                    git push || true
                '''
            }
        }
        
        stage('Sync ArgoCD') {
            steps {
                sh '''
                    kubectl patch application lims-app -n argocd --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
                '''
            }
        }
    }
}
