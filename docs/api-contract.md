# Helpdesk API Contract

All responses use `Content-Type: application/json; charset=utf-8`. Requests are read-only `GET` requests with no request body. Neither endpoint changes stored ticket data.

## `GET /api/tickets`

Returns every ticket as a JSON array. An empty collection is a successful response with an empty array.

Success: `200 OK`

```json
[
  {
    "id": 1,
    "title": "Projector does not start",
    "description": "Room B12, power light is off.",
    "status": "open"
  },
  {
    "id": 2,
    "title": "Keyboard has a broken key",
    "description": "Lab A03, workstation 4.",
    "status": "in_progress"
  },
  {
    "id": 3,
    "title": "Monitor is flickering",
    "description": "Classroom C05, display issue.",
    "status": "closed"
  }
]
```

Empty collection: `200 OK`, body `[]`.

## `GET /api/tickets/:id`

Returns one ticket. A valid id is a positive base-10 integer. A valid id that does not identify a stored ticket is unknown.

Success for `/api/tickets/2`: `200 OK`

```json
{
  "id": 2,
  "title": "Keyboard has a broken key",
  "description": "Lab A03, workstation 4.",
  "status": "in_progress"
}
```

Invalid id, such as `/api/tickets/abc` or `/api/tickets/0`: `400 Bad Request`.

```json
{
  "error": {
    "code": "INVALID_TICKET_ID",
    "message": "Ticket id must be a positive integer"
  }
}
```

Valid but unknown id, such as `/api/tickets/999`: `404 Not Found`.

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket not found"
  }
}
```

## Unknown API Route

An API path other than the two supported routes returns `404 Not Found` with JSON:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found"
  }
}
```

The 400 and 404 ticket errors share the same JSON structure (`error.code` and `error.message`); their codes and messages identify the cause.

## Manual Test Plan

Leave **Observed result** blank until implementation and week-3 testing. For the non-mutation check, record the sample data before and after each GET sequence; the contents must be identical.

| Request | Test setup | Expected status | Expected body | Observed result |
|---|---|---:|---|---|
| `GET /api/tickets` | Start server with the three sample tickets; save a before-test data snapshot. | 200 | JSON array of three ticket objects, each with `id`, `title`, `description`, and `status`; snapshot unchanged after request. | |
| `GET /api/tickets/2` | Start server with sample ticket id `2`; save a before-test data snapshot. | 200 | One ticket object with id `2`, title `Keyboard has a broken key`, description, and status `in_progress`; snapshot unchanged after request. | |
| `GET /api/tickets/999` | Ensure id `999` is not present. | 404 | JSON object shaped as `{ "error": { "code": "TICKET_NOT_FOUND", "message": "Ticket not found" } }`. | |
| `GET /api/tickets/abc` and `GET /api/tickets/0` | Send each invalid id. | 400 for each | JSON object shaped as `{ "error": { "code": "INVALID_TICKET_ID", "message": "Ticket id must be a positive integer" } }`. | |
| `GET /api/tickets` | Temporarily configure the data module with an empty array. | 200 | Empty JSON array: `[]`. | |
| `GET /api/not-a-route` | Keep the server running; request an unsupported API path. | 404 | JSON object shaped as `{ "error": { "code": "ROUTE_NOT_FOUND", "message": "Route not found" } }`. | |