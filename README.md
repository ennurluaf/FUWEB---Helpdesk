# FUWEB Campus Helpdesk

A small Express and PostgreSQL helpdesk project that brings six web-development lessons together in one browser-based learning app. The lessons cover request flow, application planning, a database-backed API, asynchronous browser behavior, JSON/XML data exchange, and manual API testing.

## Requirements

- Node.js 18 or later
- PostgreSQL 14 or later
- PostgreSQL command-line tools (`psql`) or pgAdmin to initialize the database

## Set up and run

1. Open a terminal in this project folder and install the Node dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in this folder with the connection details for your PostgreSQL server:

   ```dotenv
   PGHOST=127.0.0.1
   PGPORT=5432
   PGDATABASE=helpdesk
   PGUSER=your_postgres_user
   PGPASSWORD=your_postgres_password
   ```

   Keep real credentials private; do not commit your `.env` file.

3. Initialize the database by running `helpdesk.sql` with a PostgreSQL administrator account. For example:

   ```sh
   psql -U postgres -f helpdesk.sql
   ```

   **Warning:** this script drops and recreates the `helpdesk` database. Do not run it if you need to preserve data in an existing database with that name.

4. Start the server:

   ```sh
   node server.cjs
   ```

5. Open [http://127.0.0.1:6767](http://127.0.0.1:6767). Express serves both the lesson page and the API; do not open `public/index.html` directly.

Stop the server with Ctrl+C. The server listens on `127.0.0.1:6767`. It reads its PostgreSQL connection settings from `.env` or the process environment.

To enable the Lesson 6 database-failure check, add `ENABLE_TEST_ROUTES=true` to `.env` and restart the server.

## Lessons and features

Use the navigation at the top of the page to open each lesson:

1. **Trace a full-stack request** — follow a browser request through Express and inspect its response.
2. **Plan a small web application** — explore user stories, the ticket data model, and planned API requests.
3. **Implement the Express API** — use the interactive CRUD form to create, list, read, update, close, and delete tickets.
4. **Display ticket status asynchronously** — load and retry the ticket list or look up a ticket without reloading the page. The interface handles loading, empty, not-found, invalid-input, malformed-response, and connection-failure states.
5. **JSON & XML data exchange** — load sample JSON and XML ticket fixtures, parse them, and validate their structure and fields. Fixtures include malformed and invalid examples.
6. **Test the API against PostgreSQL** — manually exercise CRUD procedures, status transitions, search, SQL-injection test strings, and generic database-error handling with an interactive request tester.

The first lessons introduce the app incrementally; the current shared API is backed by PostgreSQL, so create, update, close, and delete actions change database records.

## API

All endpoints are mounted under `/api/tickets` and return JSON unless a successful delete has no response body.

| Method and path | Behavior |
| --- | --- |
| `GET /api/tickets` | List all tickets. |
| `GET /api/tickets?status=open` | Filter by `open`, `pending`, `resolved`, or `closed`. |
| `GET /api/tickets?search=printer` | Search ticket titles and descriptions. Search can be combined with the status filter. |
| `GET /api/tickets/:id` | Read one ticket. |
| `POST /api/tickets` | Create a ticket; new tickets start as `open`. Send `title` and `description` as JSON. |
| `PUT /api/tickets/:id` | Update a ticket's title and description, and optionally its status. |
| `POST /api/tickets/:id/close` | Close a ticket using the status workflow. |
| `DELETE /api/tickets/:id` | Delete a ticket; only closed tickets can be deleted. |

Ticket statuses are `open`, `pending`, `resolved`, and `closed`. The database enforces allowed status transitions; invalid input, missing tickets, and invalid transitions return structured JSON errors with appropriate HTTP status codes.

## Project layout

```text
db.cjs                         PostgreSQL connection pool
helpdesk.sql                   Database schema, procedures, functions, and rules
routes/
  tickets.cjs                  Ticket API routes
public/
  index.html                   Lesson page and interactive controls
  styles.css                   Lesson page styles
  crud_tester.css              API tester styles
  data-exchange/               JSON/XML lesson fixtures
  lessons/                     Browser scripts for lessons 1–6
notes/                         Lesson write-ups for lessons 1–6
screenshots/                   At least one app screenshot for each lesson
```
