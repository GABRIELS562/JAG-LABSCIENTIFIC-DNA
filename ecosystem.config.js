module.exports = {
  apps: [
    {
      name: 'lims-backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './backend/logs/pm2-error.log',
      out_file: './backend/logs/pm2-out.log',
      log_file: './backend/logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'lims-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/pm2-frontend-error.log',
      out_file: './backend/logs/pm2-frontend-out.log',
      autorestart: true,
      watch: false
    }
  ],

  // Deploy section removed - configure based on client's deployment method
  // For manual deployment, use:
  // pm2 start ecosystem.config.js --env production
  // pm2 save
  // pm2 startup
};