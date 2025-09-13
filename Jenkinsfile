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
                    ssh jaime@192.168.50.100 "cd /home/jaime/JAG-LABSCIENTIFIC-DNA && docker build -t ${REGISTRY}/${IMAGE}:${BUILD_NUMBER} -f Dockerfile.complete . && docker push ${REGISTRY}/${IMAGE}:${BUILD_NUMBER}"
                '''
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    kubectl set image deployment/lims-complete lims-complete=${REGISTRY}/${IMAGE}:${BUILD_NUMBER} -n production || true
                    kubectl rollout status deployment/lims-complete -n production --timeout=60s || true
                '''
            }
        }
    }
}
