require('dotenv').config();
const http = require('http');
const app = require('./index');

const server = http.createServer(app);
server.listen(process.env.PORT, () => {
  const stopEmailNotifications = require('./services/operationalEmailNotifications').startOperationalEmailNotifications(require('./connection'));
  server.on('close', stopEmailNotifications);
});
