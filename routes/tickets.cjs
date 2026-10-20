const express = require('express');
const tickets = require('../data/tickets.cjs');
const router = express.Router();
router.get('/', (req, res) => res.json(tickets));
router.get('/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === parseInt(req.params.id));
  if (!ticket) {
    return res.status(404).json({ error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
  }
  res.json(ticket);
});
router.post('/', (req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Ticket creation is not implemented yet' } });
});
module.exports = router;
