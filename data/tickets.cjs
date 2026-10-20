// Fictional test data. Changes remain in memory only.
// Restart the server to restore these three tickets.
const tickets = [
  {
    id: 1,
    title: "Projector does not start",
    description: "Room B12, power light is off.",
    status: "open"
  },
  {
    id: 2,
    title: "Wi-Fi disconnects frequently",
    description: "Lab C01, connection drops after a few minutes.",
    status: "in_progress"
  },
  {
    id: 3,
    title: "Keyboard has missing keys",
    description: "Room A03, workstation 7.",
    status: "closed"
  }
];

// IDs never repeat during one server run, even after a DELETE.
let nextId = 4;
function allocateId() {
  return nextId++;
}

module.exports = { tickets, allocateId };
