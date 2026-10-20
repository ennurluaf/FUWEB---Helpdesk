const section = document.querySelector('#lesson-02');
const actionSelect = section.querySelector('#lesson-02-action');
const contractStatus = section.querySelector('#lesson-02-contract');

const requests = {
  list: 'GET /api/tickets → 200 with a JSON array; the interface shows the list, an empty state, or an error.',
  detail: 'GET /api/tickets/1 → 200 with ticket 1; the interface shows its title, description, and status.',
  missing: 'GET /api/tickets/999 → 404 with a JSON error; the interface explains that the ticket was not found.'
};

function showRequestPlan() {
  contractStatus.textContent = requests[actionSelect.value];
}

actionSelect.addEventListener('change', showRequestPlan);
showRequestPlan();
