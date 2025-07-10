module.exports = {
  apps: [
    {
      name: 'lims-backend',
      script: 'server-optimized.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_file: './backend/logs/pm2-combined.log',
      time: true,
      restart_delay: 2000
    },
    {
      name: 'lims-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_file: './logs/pm2-frontend-combined.log',
      time: true,
      restart_delay: 2000
    }
  ]
};