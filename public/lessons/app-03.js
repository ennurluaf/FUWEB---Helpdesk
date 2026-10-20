const section = document.querySelector('#lesson-03');
const form = section.querySelector('#lesson-03-form');
const idInput = section.querySelector('#lesson-03-id');
const ticketStatusInput = section.querySelector('#lesson-03-ticket-status');
const titleInput = section.querySelector('#lesson-03-title-input');
const descriptionInput = section.querySelector('#lesson-03-description');
const status = section.querySelector('#lesson-03-status');
const responseOutput = section.querySelector('#lesson-03-response');

let busy = false;

function setBusy(isBusy) {
  busy = isBusy;
  form.querySelectorAll('button, input, select, textarea').forEach((element) => {
    element.disabled = isBusy;
  });
}

/** Fills the form with a ticket returned by the API. */
function fillForm(ticket) {
  idInput.value = ticket.id;
  titleInput.value = ticket.title;
  descriptionInput.value = ticket.description;
  ticketStatusInput.value = ticket.status;
}

/** Returns the ticket ID as a positive whole number, or null after showing a message. */
function readTicketId() {
  const rawId = idInput.value.trim();
  const id = Number(rawId);
  if (!rawId || !Number.isSafeInteger(id) || id <= 0) {
    status.textContent = 'Enter a positive whole-number ticket ID.';
    responseOutput.textContent = '';
    idInput.focus();
    return null;
  }
  return id;
}

/** Sends one request, shows the HTTP status and the response body, returns { ok, data }. */
async function inspectRoute(method, url, body) {
  if (busy) return { ok: false, data: null };

  responseOutput.textContent = '';
  status.textContent = `Sending ${method} ${url}…`;
  setBusy(true);

  try {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    responseOutput.textContent = text
      ? JSON.stringify(data, null, 2)
      : '(empty response body)';
    status.textContent = `${method} ${url} returned HTTP ${response.status}.`;
    return { ok: response.ok, data };
  } catch (error) {
    status.textContent = `Could not inspect ${url}. ${error.message}`;
    return { ok: false, data: null };
  } finally {
    setBusy(false);
  }
}

const actions = {
  // POST /api/tickets → 201 + new ticket (400 for an invalid title)
  async create() {
    const { ok, data } = await inspectRoute('POST', '/api/tickets', {
      title: titleInput.value,
      description: descriptionInput.value
    });
    if (ok && data) fillForm(data);
  },

  // GET /api/tickets/:id → 200 + ticket (404 when missing)
  async read() {
    const id = readTicketId();
    if (id === null) return;
    const { ok, data } = await inspectRoute('GET', `/api/tickets/${id}`);
    if (ok && data) fillForm(data);
  },

  // PUT /api/tickets/:id → 200 + updated ticket (409 when the status step is not allowed)
  async update() {
    const id = readTicketId();
    if (id === null) return;
    const body = { title: titleInput.value, description: descriptionInput.value };
    if (ticketStatusInput.value) body.status = ticketStatusInput.value;
    const { ok, data } = await inspectRoute('PUT', `/api/tickets/${id}`, body);
    if (ok && data) fillForm(data);
  },

  // POST /api/tickets/:id/close → 200 + status closed (404 when missing)
  async close() {
    const id = readTicketId();
    if (id === null) return;
    const { ok, data } = await inspectRoute('POST', `/api/tickets/${id}/close`);
    if (ok && data) fillForm(data);
  },

  // DELETE /api/tickets/:id → 204 + empty body (409 when the ticket is not closed)
  async delete() {
    const id = readTicketId();
    if (id === null) return;
    await inspectRoute('DELETE', `/api/tickets/${id}`);
  },

  // GET /api/tickets → 200 + JSON array
  async list() {
    await inspectRoute('GET', '/api/tickets');
  }
};

form.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button && !busy) actions[button.dataset.action]();
});

// Enter in a field does not reload the page.
form.addEventListener('submit', (event) => event.preventDefault());