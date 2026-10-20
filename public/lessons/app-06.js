const tester = document.querySelector('#lesson-06');
const idInput = tester.querySelector('#lesson-06-id');
const titleInput = tester.querySelector('#lesson-06-title-input');
const descriptionInput = tester.querySelector('#lesson-06-description');
const statusInput = tester.querySelector('#lesson-06-status');
const searchInput = tester.querySelector('#lesson-06-search');
const output = tester.querySelector('#lesson-06-response');

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error'
};
const INJECTION_STRINGS = [`' OR '1'='1`, `'; DROP TABLE "Ticket"; --`];
let injectionIndex = 0;

const ticketPath = () => `/api/tickets/${encodeURIComponent(idInput.value.trim())}`;

function fillForm(ticket) {
  idInput.value = ticket.id;
  titleInput.value = ticket.title;
  descriptionInput.value = ticket.description;
  statusInput.value = ticket.status;
}

async function send(method, path, body) {
  const buttons = tester.querySelectorAll('button');
  buttons.forEach((button) => { button.disabled = true; });
  output.className = 'crud-response';
  output.textContent = `${method} ${path} …`;

  try {
    const options = { method };
    if (body !== undefined) {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(path, options);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    let shown = text ? (data !== null ? JSON.stringify(data, null, 2) : text) : '(empty response body)';
    if (Array.isArray(data)) {
      shown = data.length
        ? `${data.length} ticket${data.length === 1 ? '' : 's'}:\n`
          + data.map((ticket) => `#${ticket.id}  ${ticket.status.padEnd(8)}  ${ticket.title}`).join('\n')
        : '[] (no tickets match)';
    }

    output.className = `crud-response ${response.ok ? 'is-ok' : 'is-error'}`;
    output.textContent = `${method} ${decodeURIComponent(path)}\n`
      + (body !== undefined ? `Body: ${JSON.stringify(body)}\n` : '')
      + `→ HTTP ${response.status} ${STATUS_TEXT[response.status] || ''}\n\n${shown}`;
    return { status: response.status, data };
  } catch (error) {
    output.className = 'crud-response is-error';
    output.textContent = `${method} ${path}\n→ Request failed: ${error.message}\nIs the server running?`;
    return { status: 0, data: null };
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

const actions = {
  async create() {
    const { status, data } = await send('POST', '/api/tickets', {
      title: titleInput.value,
      description: descriptionInput.value
    });
    if (status === 201 && data) fillForm(data);
  },

  async read() {
    const { status, data } = await send('GET', ticketPath());
    if (status === 200 && data) fillForm(data);
  },

  async update() {
    const body = { title: titleInput.value, description: descriptionInput.value };
    if (statusInput.value) body.status = statusInput.value;
    const { status, data } = await send('PUT', ticketPath(), body);
    if (status === 200 && data) fillForm(data);
  },

  async close() {
    const { status, data } = await send('POST', `${ticketPath()}/close`);
    if (status === 200 && data) fillForm(data);
  },

  async delete() {
    await send('DELETE', ticketPath());
  },

  async list() {
    await send('GET', '/api/tickets');
  },

  async search() {
    await send('GET', `/api/tickets?search=${encodeURIComponent(searchInput.value)}`);
  },

  injection() {
    searchInput.value = INJECTION_STRINGS[injectionIndex % INJECTION_STRINGS.length];
    injectionIndex += 1;
    searchInput.focus();
  },

  async failure() {
    await send('GET', '/api/tickets/test/db-failure');
  }
};

tester.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button && actions[button.dataset.action]) actions[button.dataset.action]();
});

tester.querySelector('form').addEventListener('submit', (event) => event.preventDefault());
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    actions.search();
  }
});
