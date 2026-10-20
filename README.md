# FUWEB · Helpdesk API — Student Back End

A **finished, local Express REST API** for the practical lesson **“Test your Back End”**. Your job is **to test it**, not to implement it. No front end and no prewritten API request or test file are included.

## 1. Start the server

Requires **Node.js 18 or newer** and an internet connection **for the initial dependency installation**.

1. Extract the ZIP into a folder.
2. Open that folder in **VS Code**.
3. In the integrated terminal run:

   ```bash
   npm install
   npm start
   ```

4. Use Postman, Bruno, Insomnia, Thunder Client or REST Client for VS Code.
5. Base address: **http://localhost:3000**.

The server runs on `127.0.0.1` (your own computer) by default. If port 3000 is already in use, choose a different one (for example `PORT=3001` on macOS/Linux or `$env:PORT=3001` in PowerShell).

**Important:** Tickets live in memory. Changes made by POST, PUT and DELETE **disappear when you stop/restart the server**, which returns the three sample tickets. This makes the exercise repeatable. The server has **no authentication or database** and must not be deployed publicly.

## 2. API contract

All responses are JSON except **204 No Content**. For POST and PUT, set the request header `Content-Type: application/json` and send a **JSON object** in the body.

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| GET | `/health` | Confirm the server is running | `200` and JSON |
| GET | `/api/tickets` | List every ticket | `200` and JSON array |
| GET | `/api/tickets?status=open` | List tickets with that status | `200` and JSON array |
| GET | `/api/tickets/:id` | Retrieve one ticket | `200` and JSON object |
| POST | `/api/tickets` | Create a ticket, ID assigned by server | `201`, JSON, and `Location` header |
| PUT | `/api/tickets/:id` | Replace **all editable fields** of one ticket | `200` and updated JSON |
| DELETE | `/api/tickets/:id` | Remove one ticket | `204` and **no body** |

The number after `/api/tickets/` is a **positive integer**. Unknown IDs do not match a record. The server does **not** implement PATCH.

### Required JSON fields for POST and PUT

- `title`: string with **3 to 100** non-whitespace characters (leading/trailing spaces are trimmed when stored).
- `description`: string with **0 to 1000** characters.
- `status`: exactly one of `open`, `in_progress`, `closed`.
- **Do not send `id`** in the JSON body; the server controls it.
- All three editable fields are **required**, even for PUT. Extra fields are rejected.

Example **ticket representation** (for understanding the data model — create your own requests in your API client):

```json
{
  "id": 1,
  "title": "Projector does not start",
  "description": "Room B12, power light is off.",
  "status": "open"
}
```

### Sending JSON with `curl.exe` in PowerShell

In PowerShell, quoting JSON directly in `curl.exe -d '...'` can result in the quotes being altered before curl sends the request. Build the JSON with `ConvertTo-Json` and pipe it to curl's standard input instead:

```powershell
$body = @{
  title = "x"
  description = "Invalid title test"
  status = "open"
} | ConvertTo-Json -Compress

$body | curl.exe -i -X POST http://127.0.0.1:3000/api/tickets `
  -H "Content-Type: application/json" `
  --data-binary "@-"
```

This sends valid JSON and should produce `400` with `VALIDATION_ERROR` because the title is only one character. Use the same body pattern with `-X PUT` and a ticket URL when testing replacement. The `@-` option tells curl to read the body from the PowerShell pipeline.

### Expected error types

| HTTP status | `error.code` | Example cause |
|---|---|---|
| 400 | `INVALID_ID` | `/api/tickets/abc` |
| 400 | `INVALID_STATUS` | Unknown status in query string |
| 400 | `VALIDATION_ERROR` | Empty title, missing field, or wrong status |
| 400 | `INVALID_JSON` | Malformed JSON text |
| 404 | `TICKET_NOT_FOUND` | Valid ID with no record |
| 404 | `ROUTE_NOT_FOUND` | Wrong route or method |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | POST/PUT without JSON Content-Type |

A validation error has `error.details`, which lists the failing rules. Other errors use this general shape:

```json
{
  "error": { "code": "TICKET_NOT_FOUND", "message": "Ticket not found" }
}
```

## 3. Initial data

When the server starts it has **three fictional tickets**:

| ID | Title | Status |
|---|---|---|
| 1 | Projector does not start | open |
| 2 | Wi-Fi disconnects frequently | in_progress |
| 3 | Keyboard has missing keys | closed |

New ticket IDs start at **4** after each fresh server start. A ticket deleted during a run remains absent until a restart.

## 4. Student task

**Do not change the server code.** Create your own requests in your chosen API client. Compare the **expected** and **actual** HTTP status, response headers, body, and any state change. Include **successful operations and intentional errors**.

Submit **a test matrix and evidence** as directed in the lesson's practical assignment. There is intentionally **no ready-made Postman collection or `.http` test file** in this project.

## 5. File structure

```text
FUWEB_Helpdesk_Backend_Studenten/
├── server.cjs
├── package.json
├── README.md
├── .gitignore
├── data/
│   └── tickets.cjs
└── routes/
    └── tickets.cjs
```

Helpful documentation: [Express](https://expressjs.com/en/starter/installing.html) · [Postman](https://www.postman.com/downloads/) · [REST Client for VS Code](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) · [Bruno](https://www.usebruno.com/downloads).
