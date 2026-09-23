require("dotenv").config();

const app = require("./app");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`MEHVAR API listening on http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("Failed to start MEHVAR server:", err.message);
  process.exit(1);
});

module.exports = server;
