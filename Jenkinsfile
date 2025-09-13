pipeline {
    agent {
        label 'jenkins-jenkins-agent'
    }
    
    stages {
        stage('Build Notice') {
            steps {
                echo "Build ${BUILD_NUMBER} triggered"
                echo "Would build Docker image here"
                echo "Registry: localhost:5000/lims-full:${BUILD_NUMBER}"
            }
        }
        
        stage('Deploy Simulation') {
            steps {
                echo "Deploying to K3s cluster"
                sh 'echo "kubectl set image deployment/lims-complete lims-complete=localhost:5000/lims-full:${BUILD_NUMBER} -n production"'
                echo "Deployment command executed (simulated)"
            }
        }
        
        stage('Success') {
            steps {
                echo "✅ CI/CD Pipeline Complete - Build ${BUILD_NUMBER}"
            }
        }
    }
}
