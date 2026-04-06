export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  authToken: process.env.DASHBOARD_AUTH_TOKEN ?? '',
  logPaths: {
    backup: process.env.BACKUP_LOG_PATH ?? '/logs/backup.log',
    autoRebuild: process.env.AUTO_REBUILD_LOG_PATH ?? '/logs/auto-rebuild.log',
  },
  nodeEnv: process.env.NODE_ENV ?? 'production',
}

if (!config.authToken) {
  console.error('FATAL: DASHBOARD_AUTH_TOKEN is not set')
  process.exit(1)
}
