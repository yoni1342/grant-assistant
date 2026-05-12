module.exports = {
  apps: [
    {
      name: "grant-assistant",
      script: "node_modules/.bin/next",
      args: "dev -H 0.0.0.0 -p 3002",
      cwd: "/root/grant-assistant",
      env: {
        NODE_ENV: "development",
        PORT: 3002,
      },
    },
    {
      name: "notification-email-listener",
      script: "node_modules/.bin/tsx",
      args: "scripts/notification-email-listener.ts",
      cwd: "/root/grant-assistant",
      env_file: ".env.local",
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
