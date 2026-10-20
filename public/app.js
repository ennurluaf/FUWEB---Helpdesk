const button = document.querySelector('#load');
const statusLbl = document.querySelector('#statusLbl');
const list = document.querySelector('#tickets');
button.addEventListener('click', async () => {
  button.disabled = true;
  statusLbl.textContent = 'Loading tickets...';
  list.replaceChildren();
  try {
    const response = await fetch('/api/tickets');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const tickets = await response.json();
    for (const ticket of tickets) {
      const item = document.createElement('li');
      item.textContent = `${ticket.title} — ${ticket.status}`;
      list.append(item);
    }
    statusLbl.textContent = tickets.length ? 'Tickets loaded.' : 'No tickets available.';
    button.style.color = 'gray';
    button.style.background = 'lightgray';
    button.style.pointerEvents = 'auto'; 
    button.style.transition = 'none'; 
    button.onmouseover = null; 
  } catch (error) {
    console.error(error);
    statusLbl.textContent = `Could not load tickets. ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
