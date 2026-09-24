

  const packageJson = {
  name: "public",
  version: "1.0.0",
  main: "server.js",
  type: "commonjs",
  scripts: {
    build: "npm install",
    start: "node server.js"
  },
  dependencies: {
    cors: "^2.8.5",
    express: "^4.19.2"
  },
  engines: {
    node: ">=18.0.0"
  }
};

