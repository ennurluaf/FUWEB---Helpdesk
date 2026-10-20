function validateTicket(ticket) {
  // TODO C1: enforce the shared ticket contract; throw an informative Error on failure.
  throw new Error("TODO: implement validateTicket");
}

function parseXmlTicket(text) {
  // TODO C2: parse XML, detect parsererror, check structure, convert id, return an object.
  throw new Error("TODO: implement parseXmlTicket");
}

async function loadTicket(file, format) {
  // TODO C3: fetch, check response.ok, parse according to format, validate, return.
  throw new Error("TODO: implement loadTicket");
}

const button = document.querySelector("#load");
const select = document.querySelector("#fixture");
const status = document.querySelector("#status");
const output = document.querySelector("#output");
button.addEventListener("click", async () => {
  button.disabled = true;
  output.textContent = "";
  status.textContent = "Loading…";
  const file = select.value;
  const format = file.endsWith(".xml") ? "xml" : "json";
  try {
    const ticket = await loadTicket(file, format);
    output.textContent = JSON.stringify(ticket, null, 2);
    status.textContent = "Success: parsed and validated.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
