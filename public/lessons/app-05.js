function validateTicket(ticket) {
  if (ticket === null || typeof ticket !== "object" || Array.isArray(ticket)) {
    throw new Error("Validation: ticket must be an object.");
  }
  if (!Number.isSafeInteger(ticket.id) || ticket.id <= 0) {
    throw new Error("Validation: id must be a positive safe integer.");
  }
  if (
    typeof ticket.title !== "string" ||
    ticket.title.length < 3 ||
    ticket.title.length > 100
  ) {
    throw new Error("Validation: title must be a string of 3–100 characters.");
  }
  if (
    typeof ticket.description !== "string" ||
    ticket.description.length > 1000
  ) {
    throw new Error(
      "Validation: description must be a string of at most 1000 characters.",
    );
  }
  if (!["open", "in_progress", "closed"].includes(ticket.status)) {
    throw new Error("Validation: status must be open, in_progress, or closed.");
  }

  return ticket;
}

function parseXmlTicket(text) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(text, "application/xml");
  } catch (error) {
    throw new Error(`Parsing: could not parse XML (${error.message}).`);
  }
  if (doc.querySelector("parsererror")) {
    throw new Error("Parsing: XML is not well-formed.");
  }

  const root = doc.documentElement;
  if (!root || root.tagName !== "ticket" || root.namespaceURI) {
    throw new Error(
      "Structure: XML root must be an unnamespaced <ticket> element.",
    );
  }

  const requiredFields = ["id", "title", "description", "status"];
  const fields = Array.from(root.children);
  if (fields.length !== requiredFields.length) {
    throw new Error(
      "Structure: <ticket> must contain exactly one child for each required field.",
    );
  }

  const values = {};
  for (const field of fields) {
    if (!requiredFields.includes(field.tagName) || field.namespaceURI) {
      throw new Error(`Structure: unexpected ticket field <${field.tagName}>.`);
    }
    if (Object.hasOwn(values, field.tagName)) {
      throw new Error(
        `Structure: <${field.tagName}> must appear exactly once.`,
      );
    }
    if (field.children.length > 0) {
      throw new Error(
        `Structure: <${field.tagName}> must contain plain text only.`,
      );
    }
    values[field.tagName] = field.textContent;
  }

  for (const field of requiredFields) {
    if (!Object.hasOwn(values, field)) {
      throw new Error(`Structure: missing <${field}> element.`);
    }
  }
  if (!/^\d+$/.test(values.id)) {
    throw new Error("Structure: <id> must contain decimal digits only.");
  }

  values.id = Number(values.id);
  return values;
}

async function loadTicket(file, format) {
  if (format !== "json" && format !== "xml") {
    throw new Error(`Parsing: unsupported format "${format}".`);
  }

  let response;
  try {
    response = await fetch(file, {
      headers: {
        Accept: format === "json" ? "application/json" : "application/xml",
      },
    });
  } catch (error) {
    throw new Error(`HTTP: request failed (${error.message}).`);
  }
  if (!response.ok) {
    throw new Error(
      `HTTP: ${response.status} ${response.statusText} while loading ${file}.`,
    );
  }

  let ticket;
  try {
    ticket =
      format === "json"
        ? await response.json()
        : parseXmlTicket(await response.text());
  } catch (error) {
    if (
      error.message.startsWith("Parsing:") ||
      error.message.startsWith("Structure:")
    ) {
      throw error;
    }
    throw new Error(
      `Parsing: could not read ${format.toUpperCase()} data (${error.message}).`,
    );
  }

  return validateTicket(ticket);
}

const button = document.querySelector("#load");
const select = document.querySelector("#fixture");
const status = document.querySelector("#status");
const output = document.querySelector("#output");
button.addEventListener("click", async () => {
  button.disabled = true;
  output.textContent = "";
  status.textContent = "Loading…";
  const file = 'data-exchange/' + select.value;
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
