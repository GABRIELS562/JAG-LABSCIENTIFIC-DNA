pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ['cat']
    tty: true
'''
        }
    }
    
    stages {
        stage('Deploy LIMS') {
            steps {
                container('kubectl') {
                    sh '''
                        kubectl rollout restart deployment lims-complete -n production
                        kubectl rollout status deployment lims-complete -n production --timeout=60s
                    '''
                }
            }
        }
    }
}
