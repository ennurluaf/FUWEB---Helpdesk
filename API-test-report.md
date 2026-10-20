# FUWEB Helpdesk API — Test Report

**Test date:** 8 October 2026  
**Base URL:** `http://localhost:3000`  
**Client:** `curl.exe`  
**Result:** 20 scenarios passed; the original three sample tickets were present at the end.

The supplied API was already responding on port 3000. Starting another `npm start` instance reported `EADDRINUSE`, so the tests were run against the server already listening there. No source files were edited.

## Test matrix

For requests with a JSON body, the `Content-Type: application/json` header was sent unless another content type is shown. GET and DELETE requests did not need a request body.

| # | Test / purpose | Method + URL | Request details | Expected | Actual | Pass / reason |
|---|---|---|---|---|---|---|
| 1 | Check API health | `GET http://localhost:3000/health` | No body | `200`, JSON `status: ok` | `200`; `{"status":"ok","service":"fuweb-helpdesk-api"}` | **Pass** — health endpoint returned the expected JSON. |
| 2 | List all tickets | `GET http://localhost:3000/api/tickets` | No body | `200`, JSON array of three tickets | `200`; array contained IDs 1, 2, and 3 | **Pass** — all three sample objects were returned. |
| 3 | Read ticket 2 | `GET http://localhost:3000/api/tickets/2` | No body | `200`, one ticket object | `200`; ticket 2, “Wi-Fi disconnects frequently” | **Pass** — returned the requested object. |
| 4 | Reject a non-numeric ID | `GET http://localhost:3000/api/tickets/abc` | No body | `400`, `INVALID_ID` | `400`; `{"error":{"code":"INVALID_ID","message":"Use a positive integer id"}}` | **Pass** — the ID is not a positive integer. |
| 5 | Find a missing ticket | `GET http://localhost:3000/api/tickets/999` | No body | `404`, `TICKET_NOT_FOUND` | `404`; `{"error":{"code":"TICKET_NOT_FOUND","message":"Ticket not found"}}` | **Pass** — valid-looking ID, but no ticket exists. |
| 6 | Reject a misspelled path | `GET http://localhost:3000/api/ticket/2` | No body | `404`, `ROUTE_NOT_FOUND` | `404`; `{"error":{"code":"ROUTE_NOT_FOUND","message":"No route matches this request"}}` | **Pass** — the route path does not match `/api/tickets`. |
| 7 | Create a valid ticket | `POST http://localhost:3000/api/tickets` | JSON: `{"title":"Test API request","description":"Temporary ticket created for API assignment verification.","status":"open"}` | `201`, created object, assigned ID and `Location` header | `201`; ID `4`; `Location: /api/tickets/4` | **Pass** — ticket was created and the response identified its URL. |
| 8 | Retrieve the created ticket | `GET http://localhost:3000/api/tickets/4` | No body | `200`, created ticket object | `200`; returned ID `4` with the submitted values | **Pass** — the new object was available by its assigned ID. |
| 9 | Reject one-character title | `POST http://localhost:3000/api/tickets` | JSON: `{"title":"x","description":"Invalid title test","status":"open"}` | `400`, `VALIDATION_ERROR` | `400`; details: `title must be text with 3 to 100 characters` | **Pass** — the title is shorter than the minimum length. |
| 10 | Replace all editable fields | `PUT http://localhost:3000/api/tickets/4` | JSON: `{"title":"Updated API test","description":"All editable fields replaced successfully.","status":"in_progress"}` | `200`, updated ticket object | `200`; object had the replacement title, description, and status | **Pass** — all editable values were replaced. |
| 11 | Verify updated ticket | `GET http://localhost:3000/api/tickets/4` | No body | `200`, new values visible | `200`; returned `Updated API test`, the new description, and `in_progress` | **Pass** — a separate GET confirmed the update persisted. |
| 12 | Delete the created ticket | `DELETE http://localhost:3000/api/tickets/4` | No body | `204`, no response body | `204 No Content`; response body empty | **Pass** — successful deletion returned no representation. |
| 13 | Verify deletion | `GET http://localhost:3000/api/tickets/4` | No body | `404`, `TICKET_NOT_FOUND` | `404`; `{"error":{"code":"TICKET_NOT_FOUND","message":"Ticket not found"}}` | **Pass** — the deleted ticket could no longer be retrieved. |
| 14 | Filter open tickets | `GET http://localhost:3000/api/tickets?status=open` | No body | `200`, only open tickets | `200`; one result, ID `1` | **Pass** — the filter returned only tickets whose status is `open`. |
| 15 | Reject invalid status filter | `GET http://localhost:3000/api/tickets?status=broken` | No body | `400`, `INVALID_STATUS` | `400`; `{"error":{"code":"INVALID_STATUS","message":"Use status=open, in_progress, or closed"}}` | **Pass** — `broken` is not an allowed status. |
| 16 | Reject PUT with missing fields | `PUT http://localhost:3000/api/tickets/2` | JSON: `{"title":"Missing description and status"}` | `400`, `VALIDATION_ERROR` | `400`; details reported missing/invalid `description` and `status` | **Pass** — PUT requires a complete set of editable fields. |
| 17 | Verify rejected PUT made no change | `GET http://localhost:3000/api/tickets/2` | No body | `200`, original ticket unchanged | `200`; original title, description, and `in_progress` status remained | **Pass** — the invalid PUT did not partially update the ticket. |
| 18 | Reject wrong request content type | `POST http://localhost:3000/api/tickets` | `Content-Type: text/plain`; JSON-shaped body | `415`, `UNSUPPORTED_MEDIA_TYPE` | `415`; `{"error":{"code":"UNSUPPORTED_MEDIA_TYPE","message":"Use Content-Type: application/json"}}` | **Pass** — the endpoint requires `application/json`. |
| 19 | Reject malformed JSON | `POST http://localhost:3000/api/tickets` | `Content-Type: application/json`; body: `{"title":` | `400`, `INVALID_JSON` | `400`; `{"error":{"code":"INVALID_JSON","message":"Request body contains invalid JSON"}}` | **Pass** — malformed JSON was reported as a client error. |
| 20 | Confirm sample data remains | `GET http://localhost:3000/api/tickets` | No body | `200`, original three tickets | `200`; IDs `1`, `2`, and `3` only | **Pass** — test ticket was removed and the original sample set remained. |

## Exported response evidence

These response excerpts are the exported HTTP evidence for the four required scenarios; status lines, relevant headers, and bodies are included.

### A. Successful GET — list tickets

```http
GET /api/tickets
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[{"id":1,"title":"Projector does not start","description":"Room B12, power light is off.","status":"open"},{"id":2,"title":"Wi-Fi disconnects frequently","description":"Lab C01, connection drops after a few minutes.","status":"in_progress"},{"id":3,"title":"Keyboard has missing keys","description":"Room A03, workstation 7.","status":"closed"}]
```

### B. Successful POST — create ticket

```http
POST /api/tickets
Content-Type: application/json

{"title":"Test API request","description":"Temporary ticket created for API assignment verification.","status":"open"}

HTTP/1.1 201 Created
Location: /api/tickets/4
Content-Type: application/json; charset=utf-8

{"id":4,"title":"Test API request","description":"Temporary ticket created for API assignment verification.","status":"open"}
```

### C. Validation error — one-character title

```http
POST /api/tickets
Content-Type: application/json

{"title":"x","description":"Invalid title test","status":"open"}

HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":{"code":"VALIDATION_ERROR","message":"Invalid ticket data","details":["title must be text with 3 to 100 characters"]}}
```

### D. Successful DELETE — no response body

```http
DELETE /api/tickets/4

HTTP/1.1 204 No Content

```

## Error-code distinctions

- **`INVALID_ID`** means the request reached a ticket-by-ID route, but the supplied ID is malformed or not a positive integer (for example, `abc`). The API returns `400`.
- **`TICKET_NOT_FOUND`** means the ID is valid, but there is no ticket with that ID (for example, `999`, or ID `4` after deletion). The API returns `404`.
- **`ROUTE_NOT_FOUND`** means the URL does not match any registered API route (for example, `/api/ticket/2`). The API returns `404`.

## Why DELETE returns 204 without JSON

`204 No Content` signals that the delete succeeded and there is no response representation to send, so the server correctly returns an empty body rather than JSON.
