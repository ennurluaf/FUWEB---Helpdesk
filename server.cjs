const express = require('express');
const path = require('node:path');
const app = express();
const ticketsRouter = require('./routes/tickets.cjs');

app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});
app.use(express.json());                                   // fills req.body for POST / PUT

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/tickets', ticketsRouter);                     // all ticket routes live under /api/tickets

app.use((req, res) => res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } }));
app.listen(6767, '127.0.0.1', () => console.log('Helpdesk: http://localhost:6767'));