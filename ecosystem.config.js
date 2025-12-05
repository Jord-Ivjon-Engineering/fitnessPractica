// PM2 Ecosystem Configuration
// Update 'cwd' path to match your deployment directory
// Default: /var/www/fitness-practica
module.exports = {
  apps: [
    {
      name: 'fitness-practica-api',
      script: './server/dist/index.js',
      cwd: '/var/www/fitness-practica', // Update this path if deploying to a different location
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads']
    }
  ]
};

