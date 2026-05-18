module.exports = {
    apps: [
        {
            name: 'pusti-backend',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            // Restart policy
            max_restarts: 10,
            min_uptime: '10s',
            // Logs
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
