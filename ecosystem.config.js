module.exports = {
  apps: [
    {
      name: "grant-assistant",
      script: "node_modules/.bin/next",
      args: "dev",
      cwd: "/root/grant-assistant",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
    },
  ],
};
