const express = require('express');
const path = require('node:path');
const app = express();
const tickets = [
  { id: 1, title: 'Projector does not start', description: 'Room B12, power light is off.', status: 'open' },
  { id: 2, title: 'Keyboard has a broken key', description: 'Lab A03, workstation 4.', status: 'in_progress' },
  { id: 3, title: 'Monitor is flickering', description: 'Classroom C05, display issue.', status: 'completed' }
];

app.use((req, res, next) => {
  console.log(req.method, req.path);
  console.log(res);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/tickets', (req, res) => res.json(tickets));
app.use((req, res) => res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } }));
app.listen(3000, '127.0.0.1', () => console.log('Helpdesk: http://localhost:3000'));
