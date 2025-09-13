pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                script {
                    // Create a build job that runs on Server1
                    sh '''
                        cat > /tmp/build-job.yaml << EOJOB
apiVersion: batch/v1
kind: Job
metadata:
  name: lims-build-${BUILD_NUMBER}
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
        - "--context=git://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA"
        - "--dockerfile=Dockerfile.complete"
        - "--destination=localhost:5000/lims-full:${BUILD_NUMBER}"
        - "--insecure"
        - "--skip-tls-verify"
      restartPolicy: Never
EOJOB
                        kubectl apply -f /tmp/build-job.yaml
                        kubectl wait --for=condition=complete job/lims-build-${BUILD_NUMBER} -n production --timeout=300s || true
                    '''
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    kubectl set image deployment/lims-complete lims-complete=localhost:5000/lims-full:${BUILD_NUMBER} -n production || true
                    kubectl rollout status deployment/lims-complete -n production --timeout=60s || true
                '''
            }
        }
    }
}
