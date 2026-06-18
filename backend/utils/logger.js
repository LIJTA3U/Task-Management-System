const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
const logFile = path.join(logsDir, 'app.log');

async function logAction(message) {
  await fs.promises.mkdir(logsDir, { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await fs.promises.appendFile(logFile, line, 'utf8');
}

module.exports = {
  logAction
};