pipeline {
    agent any
    
    environment {
        REGISTRY = 'localhost:5000'
        IMAGE = 'lims-complete'
        WORKING_VERSION = 'final-live'
    }
    
    stages {
        stage('Build Docker Image') {
            steps {
                sh '''
                    echo "Building LIMS with Jenkins-compatible Dockerfile..."
                    docker build -t ${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER} -f Dockerfile.jenkins .
                    
                    # Also tag as jenkins-latest for testing
                    docker tag ${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER} ${REGISTRY}/${IMAGE}:jenkins-latest
                '''
            }
        }
        
        stage('Push to Registry') {
            steps {
                sh '''
                    docker push ${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER}
                    docker push ${REGISTRY}/${IMAGE}:jenkins-latest
                    
                    echo "========================================="
                    echo "Build successful!"
                    echo "New image: ${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER}"
                    echo "Working production: ${REGISTRY}/${IMAGE}:${WORKING_VERSION}"
                    echo "========================================="
                '''
            }
        }
        
        stage('Deployment Instructions') {
            steps {
                sh '''
                    echo "========================================="
                    echo "MANUAL DEPLOYMENT REQUIRED"
                    echo ""
                    echo "1. TEST the new image first:"
                    echo "   kubectl run lims-test --image=${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER} --port=5173 -n default"
                    echo "   kubectl port-forward lims-test 8888:5173 -n default"
                    echo "   Test at http://localhost:8888"
                    echo ""
                    echo "2. If testing passes, UPDATE production:"
                    echo "   kubectl set image deployment/lims-complete lims-complete=${REGISTRY}/${IMAGE}:jenkins-${BUILD_NUMBER} -n production"
                    echo ""
                    echo "3. If issues occur, ROLLBACK immediately:"
                    echo "   kubectl set image deployment/lims-complete lims-complete=${REGISTRY}/${IMAGE}:${WORKING_VERSION} -n production"
                    echo "========================================="
                '''
            }
        }
    }
}
