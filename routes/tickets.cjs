const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// The table is "Ticket" with pk_ticket; the API keeps exposing it as `id`.
const COLUMNS = 'pk_ticket AS id, title, description, status';

const STATUSES = ['open', 'pending', 'resolved', 'closed'];

// Result codes of the stored procedures -> HTTP status.
const HTTP_STATUS = {
  NOT_FOUND: 404,
  INVALID_TITLE: 400,
  INVALID_DESCRIPTION: 400,
  INVALID_STATUS: 400,
  INVALID_TRANSITION: 409,
  TICKET_CLOSED: 409,
  NOT_CLOSED: 409
};

const MESSAGES = {
  NOT_FOUND: 'Ticket not found',
  INVALID_TITLE: 'Title must be at least 3 characters',
  INVALID_DESCRIPTION: 'Description is required',
  INVALID_STATUS: 'Status must be open, pending, resolved or closed',
  INVALID_TRANSITION: 'This status change is not allowed',
  TICKET_CLOSED: 'Closed tickets cannot be edited, reopen it first',
  NOT_CLOSED: 'Only closed tickets can be deleted'
};

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/** Sends the error that matches a procedure result code, e.g. 'NOT_FOUND' -> 404. */
function sendResultError(res, result) {
  const code = result === 'NOT_FOUND' ? 'TICKET_NOT_FOUND' : result;
  return sendError(res, HTTP_STATUS[result] || 400, code, MESSAGES[result] || result);
}

/** Wraps a route so a database error becomes a 500 instead of crashing the server. */
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(err.message);
    sendError(res, 500, 'DB_ERROR', 'Database error');
  }
};

/** Route parameter -> positive integer, or null. */
function ticketId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findTicket(id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM fn_getTicket($1)`, [id]);
  return rows[0] || null;
}

// GET /api/tickets                  all tickets
// GET /api/tickets?status=open      only one status
// GET /api/tickets?search=printer   keyword in title or description (can be combined with status)
router.get('/', handle(async (req, res) => {
  const { status, search } = req.query;
  if (status && !STATUSES.includes(status)) return sendResultError(res, 'INVALID_STATUS');
  if (search !== undefined) {
    // The keyword is sent as a parameter ($1), never pasted into the SQL: no injection possible.
    const { rows } = await pool.query(`SELECT ${COLUMNS} FROM fn_searchTickets($1, $2)`, [search, status || null]);
    return res.status(200).json(rows);
  }
  const { rows } = status
    ? await pool.query(`SELECT ${COLUMNS} FROM "Ticket" WHERE status::text = $1 ORDER BY pk_ticket`, [status])
    : await pool.query(`SELECT ${COLUMNS} FROM "Ticket" ORDER BY pk_ticket`);
  res.status(200).json(rows);
}));

// GET /api/tickets/test/db-failure   (only when ENABLE_TEST_ROUTES=true in .env)
// Connects with a wrong password on purpose, to prove that a database failure
// reaches the client as a generic error, without credentials or SQL details.
if (process.env.ENABLE_TEST_ROUTES === 'true') {
  router.get('/test/db-failure', handle(async () => {
    const broken = new Pool({ password: 'deliberately-wrong-password', connectionTimeoutMillis: 3000 });
    try {
      await broken.query('SELECT 1');
    } finally {
      await broken.end();
    }
  }));
}

// GET /api/tickets/2
router.get('/:id', handle(async (req, res) => {
  const id = ticketId(req);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Ticket id must be a positive number');

  const ticket = await findTicket(id);
  if (!ticket) return sendError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');
  res.status(200).json(ticket);
}));



// POST /api/tickets   { title, description }   -> new tickets are always 'open'
router.post('/', handle(async (req, res) => {
  const { title, description } = req.body || {};
  const { rows } = await pool.query('CALL sp_createTicket($1, $2, NULL, NULL)', [title, description]);
  const { out_ticketid: id, out_result: result } = rows[0];

  if (result !== 'CREATED') return sendResultError(res, result);
  res.status(201).location(`/api/tickets/${id}`).json(await findTicket(id));
}));

// PUT /api/tickets/2   { title, description, status? }
router.put('/:id', handle(async (req, res) => {
  const id = ticketId(req);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Ticket id must be a positive number');
  const { title, description, status } = req.body || {};

  const current = await findTicket(id);
  if (!current) return sendError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');

  const editFields = async () => {
    const { rows } = await pool.query('CALL sp_updateTicket($1, $2, $3, NULL)', [id, title, description]);
    return rows[0].out_result === 'UPDATED' ? null : rows[0].out_result;
  };
  const changeStatus = async () => {
    if (!status) return null;
    const { rows } = await pool.query('CALL sp_updateTicketStatus($1, $2, NULL)', [id, status]);
    return ['UPDATED', 'UNCHANGED'].includes(rows[0].out_result) ? null : rows[0].out_result;
  };

  // A closed ticket is read-only: reopen it first, then edit. Otherwise edit, then change status.
  const steps = current.status === 'closed' ? [changeStatus, editFields] : [editFields, changeStatus];
  for (const step of steps) {
    const failure = await step();
    if (failure) return sendResultError(res, failure);
  }
  res.status(200).json(await findTicket(id));
}));

// POST /api/tickets/2/close
router.post('/:id/close', handle(async (req, res) => {
  const id = ticketId(req);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Ticket id must be a positive number');

  const { rows } = await pool.query('CALL sp_closeTicket($1, NULL)', [id]);
  const result = rows[0].out_result;
  if (result !== 'UPDATED' && result !== 'UNCHANGED') return sendResultError(res, result);
  res.status(200).json(await findTicket(id));
}));

// DELETE /api/tickets/2   (only closed tickets)
router.delete('/:id', handle(async (req, res) => {
  const id = ticketId(req);
  if (!id) return sendError(res, 400, 'INVALID_ID', 'Ticket id must be a positive number');

  const { rows } = await pool.query('CALL sp_deleteTicket($1, NULL)', [id]);
  if (rows[0].out_result !== 'DELETED') return sendResultError(res, rows[0].out_result);
  res.status(204).end();
}));

module.exports = router;