const express = require('express');
const path = require('node:path');
const ticketsRouter = require('./routes/tickets.cjs');
const app = express();
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/tickets', ticketsRouter);
app.use((req, res) => res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } }));
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
});
app.listen(3001, '127.0.0.1', () => console.log('Helpdesk: http://localhost:3001'));
module.exports = app;
