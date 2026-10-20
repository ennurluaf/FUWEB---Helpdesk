# Week 2: Helpdesk Implementation Plan

## A. Brief and Stories

Our school helpdesk needs a small, dependable way for staff and students to check support tickets without asking an administrator for every update. The first version will let users see all tickets, open one ticket to read its details, and understand clear loading, empty, and failure states. The three-week scope is read-only; creating tickets, signing in, and persistent database storage are later milestones.

### User stories and acceptance criteria

1. **List all tickets:** As a helpdesk user, I want to see all tickets so I can scan their titles and statuses.
   - Success: A successful collection request displays every returned ticket's title and status.
   - Edge/error: An empty collection displays “No tickets yet”; a failed request displays a useful error and allows retrying.
2. **View one ticket:** As a helpdesk user, I want to open a ticket so I can read its description and current status.
   - Success: Selecting a ticket displays its id, title, description, and status.
   - Edge/error: While loading, show a loading state; if the request fails, show an error without presenting stale details as current.
3. **Understand a missing ticket:** As a helpdesk user, I want a clear message when a ticket does not exist so I know the link or id is not valid.
   - Success: A valid but unknown id receives HTTP 404 and the interface says the ticket was not found.
   - Edge/error: A malformed or non-positive id receives HTTP 400 and the interface reports an invalid ticket id.

### Later milestones

- Create or edit tickets
- User accounts and login
- Database persistence

## B. Data and Interface

### Data dictionary

| Field | Type | Rules | Example |
|---|---|---|---|
| `id` | positive integer | Unique per ticket; used in `/api/tickets/:id` | `1` |
| `title` | non-empty string | Short summary; required | `Projector does not start` |
| `description` | non-empty string | Gives enough context to understand the issue | `Room B12, power light is off.` |
| `status` | string enum | Exactly one of `open`, `in_progress`, `closed` | `open` |

### Sample records

These fictional records use the same field names and status values as the data dictionary and API examples.

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

### Interface sketches

```text
TICKET LIST                         TICKET DETAIL
+--------------------------+        +--------------------------+
| Campus helpdesk          |        | < Back to tickets        |
| [Loading tickets...]     |        | Ticket #2                |
|                          |        | Keyboard has a broken key|
| [1] Projector...   open  |        | Lab A03, workstation 4.  |
| [2] Keyboard... in_prog. |        | Status: in_progress      |
| [3] Monitor...    closed |        +--------------------------+
+--------------------------+

Empty list:  “No tickets yet.”
List error:  “Could not load tickets. [Retry]”
Detail load: “Loading ticket...”
Detail error:“Could not load ticket. [Retry]”
Missing:     “Ticket not found.”
Invalid id:  “That ticket id is invalid.”
```

### Interface action to API request

| Interface action | Request | Expected result |
|---|---|---|
| Open or refresh the list | `GET /api/tickets` | Render list, empty state, or collection error state |
| Select a ticket with id `2` | `GET /api/tickets/2` | Render that ticket's details |
| Open an unknown ticket link, such as id `999` | `GET /api/tickets/999` | Show not-found state |
| Attempt an invalid id, such as `abc` or `0` | `GET /api/tickets/abc` or `/api/tickets/0` | Show invalid-id state |

### Progress checkpoint and consistency check

The stories, dictionary, sample records, sketches, and API plan use `id`, `title`, `description`, and `status`. The status values are consistently `open`, `in_progress`, and `closed`; ids `1`, `2`, and `3` are unique. One inconsistency was found in the current implementation: `GET /api/tickets/:id` currently returns 404 for a malformed id such as `abc`; the target contract distinguishes malformed ids (400) from valid unknown ids (404). Week 3 must implement and verify that distinction.

### Partner trace check

Trace one story: selecting ticket `2` in the list sends `GET /api/tickets/2`; the API returns HTTP 200 with the ticket object; the detail view shows “Keyboard has a broken key,” its description, and `in_progress` status. The wording is now explicit that selecting an item sends a request for its id, and that the detail view renders all four contract fields. **Partner follow-up:** ask a partner to trace this path against the sketch and confirm the response fields are clear.

## C. Planned File Tree and Responsibilities

```text
helpdesk/
├── server.cjs              # Entry point: create app, register middleware/router, listen
├── routes/
│   └── tickets.cjs         # Ticket collection/detail endpoints and id error handling
├── data/
│   └── tickets.cjs         # Supplies the three in-memory sample records
├── public/
│   ├── index.html          # Helpdesk page structure
│   └── app.js              # Fetches API data and renders list/detail/states
├── docs/
│   └── api-contract.md     # Endpoint contract and manual test plan
└── notes/
    └── week-02.md          # Stories, data, sketches, and ordered backlog
```

The target `data/tickets.cjs` will hold the sample array that is currently in `tickets.json`. The entry point wires the app; the router handles ticket requests; the data module supplies the sample array. The existing `package.json` remains at the project root to define the start command and dependency.

## D. Ordered Backlog

1. Move the sample records into `data/tickets.cjs` without changing field names or status values.
2. Create `routes/tickets.cjs` with `GET /api/tickets` returning the sample array as JSON.
3. Wire the router and static `public/` directory from `server.cjs`; verify the collection endpoint with a direct HTTP request.
4. Add the detail endpoint with positive-integer id validation, 400 invalid-id handling, and 404 unknown-ticket handling.
5. Run the six API manual tests in `docs/api-contract.md`, including the empty-collection setup and unknown route; confirm GET requests do not mutate data.
6. Update the browser list view to fetch the collection and render loading, populated, empty, and retryable error states.
7. Add the detail view, request it when a list item is selected, and display not-found and invalid-id responses clearly.
8. Walk through the three stories in the browser and record observed results in the test table.

The API and its error cases are tested before the detail interface is added.

## Optional Extension: Status Filter (Design Only)

If added later, `?status=` accepts only `open`, `in_progress`, or `closed`; an unknown value returns HTTP 400 with the standard error JSON shape. Test cases: `GET /api/tickets?status=open` returns 200 and only open tickets; `GET /api/tickets?status=waiting` returns 400 with `INVALID_STATUS`.

## Exit Ticket

Using one shared API contract for field names, status values, and error shapes prevents the front end and back end from making incompatible assumptions.