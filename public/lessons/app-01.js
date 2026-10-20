const section = document.querySelector('#lesson-01');
const button = section.querySelector('#lesson-01-load');
const status = section.querySelector('#lesson-01-status');
const records = section.querySelector('#lesson-01-records');
const responseSummary = section.querySelector('#lesson-01-response');

button.addEventListener('click', async () => {
  records.replaceChildren();
  responseSummary.textContent = '';
  status.textContent = 'Starting GET /api/tickets…';
  button.disabled = true;

  try {
    const response = await fetch('/api/tickets');
    status.textContent = `Response received: HTTP ${response.status}. Reading JSON body…`;
    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}.`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('The response body was not a ticket array.');
    }

    data.forEach((ticket) => {
      const item = document.createElement('li');
      item.textContent = `#${ticket.id}: ${ticket.title} — ${ticket.status}`;
      records.append(item);
    });

    responseSummary.textContent = `Request: GET /api/tickets\nStatus: ${response.status}\nBody: JSON array with ${data.length} ticket${data.length === 1 ? '' : 's'}`;
    status.textContent = 'The browser parsed the response and rendered the records.';
  } catch (error) {
    status.textContent = `Trace failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
