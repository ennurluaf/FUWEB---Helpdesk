const loadButton = document.querySelector('#load');
const statusLabel = document.querySelector('#status');
const list = document.querySelector('#tickets');
const detail = document.querySelector('#detail');
const searchInput = document.querySelector('#search');
const filters = document.querySelectorAll('.filter');
const totalCount = document.querySelector('#total-count');
const openCount = document.querySelector('#open-count');
const closedCount = document.querySelector('#closed-count');
let tickets = [];
let activeFilter = 'all';
let selectedId = null;

function formatStatus(status) {
  return status.replace('_', ' ');
}

function statusClass(status) {
  return `status-${status.replace('_', '-')}`;
}

function showMessage(message, isError = false, withRetry = false) {
  list.replaceChildren();
  const item = document.createElement('li');
  item.className = `message${isError ? ' error' : ''}`;
  item.textContent = message;
  if (withRetry) {
    const retry = document.createElement('button');
    retry.className = 'retry';
    retry.type = 'button';
    retry.textContent = ' Try again';
    retry.addEventListener('click', loadTickets);
    item.append(retry);
  }
  list.append(item);
}

function updateStats() {
  totalCount.textContent = tickets.length;
  openCount.textContent = tickets.filter(ticket => ticket.status !== 'closed').length;
  closedCount.textContent = tickets.filter(ticket => ticket.status === 'closed').length;
}

function visibleTickets() {
  const query = searchInput.value.trim().toLowerCase();
  return tickets.filter(ticket => {
    const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
    const searchable = `${ticket.title}${ticket.description}`.toLowerCase();
    return matchesFilter && searchable.includes(query);
  });
}

function renderList() {
  const visible = visibleTickets();
  if (!visible.length) {
    showMessage(tickets.length ? 'No tickets match your search.' : 'No tickets yet.');
    return;
  }

  list.replaceChildren();
  visible.forEach(ticket => {
    const item = document.createElement('li');
    item.className = 'ticket';
    const button = document.createElement('button');
    button.className = `ticket-button${selectedId === ticket.id ? ' selected' : ''}`;
    button.type = 'button';
    button.innerHTML = `<span class="ticket-number">#${ticket.id}</span><span><span class="ticket-title">${ticket.title}</span><span class="ticket-description">${ticket.description}</span></span><span class="status ${statusClass(ticket.status)}">${formatStatus(ticket.status)}</span>`;
    button.addEventListener('click', () => loadDetail(ticket.id));
    item.append(button);
    list.append(item);
  });
}

function renderDetail(ticket) {
  detail.innerHTML = `<div class="detail-kicker">Ticket #${ticket.id}</div><h2 id="detail-title"></h2><p class="detail-copy"></p><div class="detail-meta"><span>Current status</span><span class="status ${statusClass(ticket.status)}">${formatStatus(ticket.status)}</span></div>`;
  detail.querySelector('h2').textContent = ticket.title;
  detail.querySelector('.detail-copy').textContent = ticket.description;
}

async function loadDetail(id) {
  selectedId = id;
  renderList();
  detail.innerHTML = '<div class="detail-kicker">Ticket detail</div><h2 id="detail-title">Loading ticket...</h2><p class="detail-copy">Fetching the latest information.</p>';
  try {
    const response = await fetch(`/api/tickets/${id}`);
    if (!response.ok) throw new Error(response.status === 404 ? 'Ticket not found.' : `Request failed: ${response.status}`);
    renderDetail(await response.json());
  } catch (error) {
    detail.innerHTML = `<div class="detail-kicker">Ticket detail</div><h2 id="detail-title">Unable to load ticket</h2><p class="detail-copy">${error.message}</p>`;
  }
}

async function loadTickets() {
  loadButton.disabled = true;
  statusLabel.textContent = 'Loading...';
  showMessage('Loading tickets...');
  try {
    const response = await fetch('/api/tickets');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    tickets = await response.json();
    updateStats();
    renderList();
    statusLabel.textContent = `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`;
  } catch (error) {
    tickets = [];
    updateStats();
    showMessage(`Could not load tickets. ${error.message}`, true, true);
    statusLabel.textContent = 'Connection error';
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener('click', loadTickets);
searchInput.addEventListener('input', renderList);
filters.forEach(filter => filter.addEventListener('click', () => {
  activeFilter = filter.dataset.filter;
  filters.forEach(item => item.classList.toggle('active', item === filter));
  renderList();
}));

loadTickets();