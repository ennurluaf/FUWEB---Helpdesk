const express = require("express");
const router = express.Router();
const { tickets, allocateId } = require("../data/tickets.cjs");

const allowedStatuses = ["open", "in_progress", "closed"];
const allowedFields = ["title", "description", "status"];

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details && details.length) error.details = details;
  return res.status(status).json({ error });
}

function parseId(req, res) {
  // Route parameters arrive as strings. Our contract requires a positive integer.
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    sendError(res, 400, "INVALID_ID", "Use a positive integer id");
    return null;
  }
  return id;
}

function findTicketOrRespond(req, res) {
  const id = parseId(req, res);
  if (id === null) return null;

  const ticket = tickets.find(item => item.id === id);
  if (!ticket) {
    sendError(res, 404, "TICKET_NOT_FOUND", "Ticket not found");
    return null;
  }
  return ticket;
}

function requireJson(req, res, next) {
  // The API accepts JSON request bodies for POST and PUT.
  const contentType = (req.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return sendError(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Use Content-Type: application/json");
  }
  next();
}

function validateTicket(body) {
  const problems = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["The body must be a JSON object"];
  }

  const unexpected = Object.keys(body).filter(key => !allowedFields.includes(key));
  if (unexpected.length) {
    problems.push(`Unknown field(s): ${unexpected.join(", ")}`);
  }
  if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 100) {
    problems.push("title must be text with 3 to 100 characters");
  }
  if (typeof body.description !== "string" || body.description.length > 1000) {
    problems.push("description must be text with no more than 1000 characters");
  }
  if (!allowedStatuses.includes(body.status)) {
    problems.push("status must be open, in_progress, or closed");
  }
  return problems;
}

function editableFields(body) {
  return {
    title: body.title.trim(),
    description: body.description,
    status: body.status
  };
}

// GET /api/tickets or GET /api/tickets?status=open
router.get("/", (req, res) => {
  const status = req.query.status;
  if (status !== undefined && (typeof status !== "string" || !allowedStatuses.includes(status))) {
    return sendError(res, 400, "INVALID_STATUS", "Use status=open, in_progress, or closed");
  }
  const result = status ? tickets.filter(ticket => ticket.status === status) : tickets;
  return res.status(200).json(result);
});

// GET /api/tickets/2
router.get("/:id", (req, res) => {
  const ticket = findTicketOrRespond(req, res);
  if (ticket === null) return;
  return res.status(200).json(ticket);
});

// POST /api/tickets
router.post("/", requireJson, (req, res) => {
  const problems = validateTicket(req.body);
  if (problems.length) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid ticket data", problems);
  }
  const ticket = { id: allocateId(), ...editableFields(req.body) };
  tickets.push(ticket);
  res.location(`/api/tickets/${ticket.id}`);
  return res.status(201).json(ticket);
});

// PUT /api/tickets/2 — complete replacement of editable fields
router.put("/:id", requireJson, (req, res) => {
  const ticket = findTicketOrRespond(req, res);
  if (ticket === null) return;

  const problems = validateTicket(req.body);
  if (problems.length) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid ticket data", problems);
  }
  Object.assign(ticket, editableFields(req.body));
  return res.status(200).json(ticket);
});

// DELETE /api/tickets/2
router.delete("/:id", (req, res) => {
  const ticket = findTicketOrRespond(req, res);
  if (ticket === null) return;

  const index = tickets.findIndex(item => item.id === ticket.id);
  tickets.splice(index, 1);
  return res.status(204).end(); // 204 = no response body
});

module.exports = router;
