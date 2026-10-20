const section = document.querySelector('#lesson-04');
const loadButton = section.querySelector('#lesson-04-load');
const detailForm = section.querySelector('#lesson-04-detail-form');
const ticketIdInput = section.querySelector('#lesson-04-id');
const detailSubmitButton = section.querySelector('#lesson-04-detail-submit');
const detailStatus = section.querySelector('#lesson-04-detail-status');
const ticketDetails = section.querySelector('#lesson-04-details');

let busy = false;

function setBusy(isBusy) {
  busy = isBusy;
  loadButton.disabled = isBusy;
  ticketIdInput.disabled = isBusy;
  detailSubmitButton.disabled = isBusy;
}

async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Network error: could not reach the server. Check the connection and retry.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned invalid JSON. Please retry or contact support.');
  }

  if (!response.ok) {
    const message = data && data.error && typeof data.error.message === 'string'
      ? data.error.message
      : `The request failed with HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

function isTicketSummary(ticket) {
  return ticket !== null
    && typeof ticket === 'object'
    && Number.isSafeInteger(ticket.id)
    && ticket.id > 0
    && typeof ticket.title === 'string'
    && typeof ticket.status === 'string';
}

function isTicketDetail(ticket) {
  return isTicketSummary(ticket) && typeof ticket.description === 'string';
}

async function loadTickets() {
  if (busy) return;

  ticketDetails.replaceChildren();
  detailStatus.textContent = 'Loading tickets…';
  setBusy(true);

  try {
    const data = await getJSON('/api/tickets');
    if (!Array.isArray(data)) {
      throw new Error('The server returned an unexpected ticket list. Please retry or contact support.');
    }
    if (!data.every(isTicketSummary)) {
      throw new Error('The server returned a ticket with missing or invalid fields.');
    }
    if (data.length === 0) {
      detailStatus.textContent = 'No tickets yet.';
      return;
    }

    const items = data.map((ticket) => {
      const item = document.createElement('li');
      item.textContent = `#${ticket.id}: ${ticket.title} — ${ticket.status}`;
      return item;
    });
    ticketDetails.replaceChildren(...items);
    detailStatus.textContent = `Loaded ${data.length} ticket${data.length === 1 ? '' : 's'}.`;
  } catch (error) {
    detailStatus.textContent = `Could not load tickets. ${error.message}`;
  } finally {
    setBusy(false);
  }
}

async function loadTicketDetails(event) {
  event.preventDefault();
  if (busy) return;

  const rawId = ticketIdInput.value.trim();
  const id = Number(rawId);
  if (!rawId || !Number.isSafeInteger(id) || id <= 0) {
    ticketDetails.replaceChildren();
    detailStatus.textContent = 'Enter a positive whole-number ticket ID.';
    return;
  }

  ticketDetails.replaceChildren();
  detailStatus.textContent = 'Loading ticket…';
  setBusy(true);

  try {
    const ticket = await getJSON(`/api/tickets/${id}`);
    if (!isTicketDetail(ticket)) {
      throw new Error('The server returned ticket data with missing or invalid fields.');
    }

    const items = [
      `Ticket #${ticket.id}`,
      ticket.title,
      ticket.description,
      `Status: ${ticket.status}`
    ].map((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      return item;
    });
    ticketDetails.replaceChildren(...items);
    detailStatus.textContent = `Ticket #${ticket.id} loaded.`;
  } catch (error) {
    detailStatus.textContent = error.status === 404
      ? 'Ticket not found (404). Check the ID and try again.'
      : `Could not load ticket. ${error.message}`;
  } finally {
    setBusy(false);
  }
}

loadButton.addEventListener('click', loadTickets);
detailForm.addEventListener('submit', loadTicketDetails);
