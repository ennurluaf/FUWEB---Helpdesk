-- ============================================================
--  Helpdesk Ticketing System — Physical Data Model (PDM)
--  Convention : New_DB_Conventions_2024_v020
--  Target     : PostgreSQL 14+   (run with psql, see the end)
-- ============================================================
--
--  Routine inventory (17 total)
--  ────────────────────────────────────────────────────────────
--  TICKET         sp_createTicket          fn_getTicket
--                 sp_updateTicket          sp_deleteTicket
--
--  LISTING        fn_getAllTickets         fn_getTicketsByStatus
--                 fn_searchTickets         fn_countTicketsByStatus
--
--  STATUS FLOW    sp_updateTicketStatus    sp_setTicketPending
--                 sp_resolveTicket         sp_closeTicket
--                 sp_reopenTicket
--
--  BULK OPS       sp_closeResolvedTickets  sp_deleteClosedTickets
--
--  VALIDATION     sp_validateTicketInput   fn_isValidTransition
--
--  Why sp_ and fn_?
--  ────────────────
--  PostgreSQL procedures (CALL) can change data and return OUT
--  values, but cannot return rows. Everything that returns rows
--  is therefore a function (SELECT * FROM fn_...), which is what
--  the fn_ prefix of the convention is for.
--
--  Status workflow
--  ───────────────
--  open     -> pending | resolved | closed
--  pending  -> open    | resolved
--  resolved -> closed  | open
--  closed   -> open
--  Enforced by fn_isValidTransition and the trigger
--  tr_checkTicketStatus, so even direct UPDATEs cannot skip a step.
--
--  Naming convention summary
--  ─────────────────────────
--  Tables         : UpperCamelCase
--  Columns        : lowerCamelCase
--  Primary keys   : pk_<className>
--  Indexes        : idx_<type>_<field>
--  Views          : vw_<purposeName>
--  Stored procs   : sp_<purposeName>
--  Functions      : fn_<purposeName>
--  Triggers       : tr_<purposeName>
--  Local variables: v_<name>
--  IN  parameters : in_<name>
--  OUT parameters : out_<name>
--
--  PostgreSQL and capital letters
--  ──────────────────────────────
--  PostgreSQL lowercases every name that is not in double quotes.
--  Tables, views and types are quoted ("Ticket") so they keep
--  their convention spelling in pgAdmin and diagrams; you must
--  quote them in queries too. Routines are not quoted: you can
--  call them exactly as written (CALL sp_createTicket(...)), they
--  are just stored in lowercase.
-- ============================================================

DROP DATABASE IF EXISTS helpdesk;
CREATE DATABASE helpdesk ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';
\connect helpdesk

-- ============================================================
--  TYPES
-- ============================================================

CREATE TYPE "TicketStatus" AS ENUM ('open', 'pending', 'resolved', 'closed');


-- ============================================================
--  TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS "Ticket" (
    pk_ticket   INTEGER        NOT NULL GENERATED ALWAYS AS IDENTITY,
    title       VARCHAR(150)   NOT NULL,
    description TEXT           NOT NULL,
    status      "TicketStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT pk_ticket PRIMARY KEY (pk_ticket)
);


-- ============================================================
--  INDEXES
-- ============================================================

CREATE INDEX idx_status ON "Ticket" (status);
CREATE INDEX idx_title  ON "Ticket" (title);

-- ============================================================
--  TICKET — CRUD
-- ============================================================

-- ------------------------------------------------------------
--  sp_createTicket
--  Opens a new ticket. New tickets always start as 'open'.
--  OUT out_ticketId  — new pk_ticket on success
--  OUT out_result    — 'CREATED' | 'INVALID_TITLE' | 'INVALID_DESCRIPTION'
-- ------------------------------------------------------------
CREATE PROCEDURE sp_createTicket (
    IN  in_title       VARCHAR(150),
    IN  in_description TEXT,
    OUT out_ticketId   INTEGER,
    OUT out_result     VARCHAR(25)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_valid  BOOLEAN;
    v_reason VARCHAR(25);
BEGIN
    CALL sp_validateTicketInput(in_title, in_description, v_valid, v_reason);

    IF NOT v_valid THEN
        out_ticketId := NULL;
        out_result   := v_reason;
    ELSE
        INSERT INTO "Ticket" (title, description)
        VALUES (TRIM(in_title), TRIM(in_description))
        RETURNING pk_ticket INTO out_ticketId;
        out_result := 'CREATED';
    END IF;
END;
$$;

-- ------------------------------------------------------------
--  sp_readTicket
--  Returns a single ticket row by pk_ticket (no row = not found).
-- ------------------------------------------------------------
CREATE PROCEDURE sp_readTicket (
    IN in_ticketId INTEGER,
    OUT out_ticket "Ticket"
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT pk_ticket, title, description, status
    FROM   "Ticket"
    WHERE  pk_ticket = in_ticketId
    INTO out_ticket;
END;
$$;
AS $$
    SELECT pk_ticket, title, description, status
    FROM   "Ticket"
    WHERE  pk_ticket = in_ticketId;
$$;

-- ------------------------------------------------------------
--  sp_updateTicket
--  Updates the title and description of a ticket.
--  Closed tickets are read-only: reopen them first.
--  OUT out_result  — 'UPDATED' | 'NOT_FOUND' | 'TICKET_CLOSED'
--                    | 'INVALID_TITLE' | 'INVALID_DESCRIPTION'
-- ------------------------------------------------------------
CREATE PROCEDURE sp_updateTicket (
    IN  in_ticketId    INTEGER,
    IN  in_title       VARCHAR(150),
    IN  in_description TEXT,
    OUT out_result     VARCHAR(25)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status "TicketStatus";
    v_valid  BOOLEAN;
    v_reason VARCHAR(25);
BEGIN
    SELECT status INTO v_status FROM "Ticket" WHERE pk_ticket = in_ticketId;

    IF NOT FOUND THEN
        out_result := 'NOT_FOUND';
    ELSIF v_status = 'closed' THEN
        out_result := 'TICKET_CLOSED';
    ELSE
        CALL sp_validateTicketInput(in_title, in_description, v_valid, v_reason);
        IF NOT v_valid THEN
            out_result := v_reason;
        ELSE
            UPDATE "Ticket"
            SET    title       = TRIM(in_title),
                   description = TRIM(in_description)
            WHERE  pk_ticket = in_ticketId;
            out_result := 'UPDATED';
        END IF;
    END IF;
END;
$$;

-- ------------------------------------------------------------
--  sp_deleteTicket
--  Deletes a ticket. Only closed tickets can be deleted, so no
--  ticket that is still being worked on disappears by accident.
--  OUT out_result  — 'DELETED' | 'NOT_FOUND' | 'NOT_CLOSED'
-- ------------------------------------------------------------
CREATE PROCEDURE sp_deleteTicket (
    IN  in_ticketId INTEGER,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status "TicketStatus";
BEGIN
    SELECT status INTO v_status FROM "Ticket" WHERE pk_ticket = in_ticketId;

    IF NOT FOUND THEN
        out_result := 'NOT_FOUND';
    ELSIF v_status <> 'closed' THEN
        out_result := 'NOT_CLOSED';
    ELSE
        DELETE FROM "Ticket" WHERE pk_ticket = in_ticketId;
        out_result := 'DELETED';
    END IF;
END;
$$;


-- ============================================================
--  TICKET — LISTING
-- ============================================================

-- ------------------------------------------------------------
--  fn_getAllTickets
--  Returns every ticket, newest first.
-- ------------------------------------------------------------
CREATE FUNCTION fn_getAllTickets ()
RETURNS SETOF "Ticket"
LANGUAGE sql
STABLE
AS $$
    SELECT pk_ticket, title, description, status
    FROM   "Ticket"
    ORDER  BY pk_ticket DESC;
$$;

-- ------------------------------------------------------------
--  fn_getTicketsByStatus
--  Returns the tickets that have one status, newest first.
--  Raises 'INVALID_STATUS' for an unknown status.
-- ------------------------------------------------------------
CREATE FUNCTION fn_getTicketsByStatus (
    in_status TEXT
)
RETURNS SETOF "Ticket"
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF NOT fn_isValidStatus(in_status) THEN
        RAISE EXCEPTION 'INVALID_STATUS: "%" is not a ticket status', in_status
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    RETURN QUERY
        SELECT t.pk_ticket, t.title, t.description, t.status
        FROM   "Ticket" t
        WHERE  t.status = in_status::"TicketStatus"
        ORDER  BY t.pk_ticket DESC;
END;
$$;

-- ------------------------------------------------------------
--  fn_searchTickets
--  Case-insensitive keyword search in title and description.
--  An optional status narrows the search (NULL = all statuses).
-- ------------------------------------------------------------
CREATE FUNCTION fn_searchTickets (
    in_keyword TEXT,
    in_status  TEXT DEFAULT NULL
)
RETURNS SETOF "Ticket"
LANGUAGE sql
STABLE
AS $$
    SELECT pk_ticket, title, description, status
    FROM   "Ticket"
    WHERE  (title ILIKE '%' || TRIM(in_keyword) || '%'
            OR description ILIKE '%' || TRIM(in_keyword) || '%')
      AND  (in_status IS NULL OR status::TEXT = in_status)
    ORDER  BY pk_ticket DESC;
$$;

-- ------------------------------------------------------------
--  fn_countTicketsByStatus
--  Returns one row per status with its ticket count, including
--  statuses that currently have no tickets (count 0).
-- ------------------------------------------------------------
CREATE FUNCTION fn_countTicketsByStatus ()
RETURNS TABLE (status "TicketStatus", "ticketCount" BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT s.value, COUNT(t.pk_ticket)
    FROM   UNNEST(enum_range(NULL::"TicketStatus")) WITH ORDINALITY AS s (value, sortOrder)
    LEFT   JOIN "Ticket" t ON t.status = s.value
    GROUP  BY s.value, s.sortOrder
    ORDER  BY s.sortOrder;
$$;


-- ============================================================
--  TICKET — STATUS FLOW
-- ============================================================

-- ------------------------------------------------------------
--  sp_updateTicketStatus
--  Moves a ticket to another status if the workflow allows it.
--  The shortcut procedures below all reuse this one.
--  OUT out_result  — 'UPDATED' | 'NOT_FOUND' | 'INVALID_STATUS'
--                    | 'UNCHANGED' | 'INVALID_TRANSITION'
-- ------------------------------------------------------------
CREATE PROCEDURE sp_updateTicketStatus (
    IN  in_ticketId INTEGER,
    IN  in_status   TEXT,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_currentStatus "TicketStatus";
BEGIN
    SELECT status INTO v_currentStatus FROM "Ticket" WHERE pk_ticket = in_ticketId;

    IF NOT FOUND THEN
        out_result := 'NOT_FOUND';
    ELSIF NOT fn_isValidStatus(in_status) THEN
        out_result := 'INVALID_STATUS';
    ELSIF v_currentStatus::TEXT = in_status THEN
        out_result := 'UNCHANGED';
    ELSIF NOT fn_isValidTransition(v_currentStatus::TEXT, in_status) THEN
        out_result := 'INVALID_TRANSITION';
    ELSE
        UPDATE "Ticket" SET status = in_status::"TicketStatus" WHERE pk_ticket = in_ticketId;
        out_result := 'UPDATED';
    END IF;
END;
$$;

-- ------------------------------------------------------------
--  sp_setTicketPending
--  Puts a ticket on hold (waiting for the requester / a part).
--  OUT out_result  — see sp_updateTicketStatus
-- ------------------------------------------------------------
CREATE PROCEDURE sp_setTicketPending (
    IN  in_ticketId INTEGER,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL sp_updateTicketStatus(in_ticketId, 'pending', out_result);
END;
$$;

-- ------------------------------------------------------------
--  sp_resolveTicket
--  Marks a ticket as resolved (fix delivered, awaiting closure).
--  OUT out_result  — see sp_updateTicketStatus
-- ------------------------------------------------------------
CREATE PROCEDURE sp_resolveTicket (
    IN  in_ticketId INTEGER,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL sp_updateTicketStatus(in_ticketId, 'resolved', out_result);
END;
$$;

-- ------------------------------------------------------------
--  sp_closeTicket
--  Closes a ticket for good (it becomes read-only).
--  OUT out_result  — see sp_updateTicketStatus
-- ------------------------------------------------------------
CREATE PROCEDURE sp_closeTicket (
    IN  in_ticketId INTEGER,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL sp_updateTicketStatus(in_ticketId, 'closed', out_result);
END;
$$;

-- ------------------------------------------------------------
--  sp_reopenTicket
--  Reopens a pending, resolved or closed ticket.
--  OUT out_result  — see sp_updateTicketStatus
-- ------------------------------------------------------------
CREATE PROCEDURE sp_reopenTicket (
    IN  in_ticketId INTEGER,
    OUT out_result  VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL sp_updateTicketStatus(in_ticketId, 'open', out_result);
END;
$$;


-- ============================================================
--  TICKET — BULK OPERATIONS
-- ============================================================

-- ------------------------------------------------------------
--  sp_closeResolvedTickets
--  Closes every resolved ticket in one go (end-of-week cleanup).
--  OUT out_count  — number of tickets closed
-- ------------------------------------------------------------
CREATE PROCEDURE sp_closeResolvedTickets (
    OUT out_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "Ticket" SET status = 'closed' WHERE status = 'resolved';
    GET DIAGNOSTICS out_count = ROW_COUNT;
END;
$$;

-- ------------------------------------------------------------
--  sp_deleteClosedTickets
--  Purges all closed tickets.
--  OUT out_count  — number of tickets deleted
-- ------------------------------------------------------------
CREATE PROCEDURE sp_deleteClosedTickets (
    OUT out_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "Ticket" WHERE status = 'closed';
    GET DIAGNOSTICS out_count = ROW_COUNT;
END;
$$;


-- ============================================================
--  VIEWS
-- ============================================================

CREATE VIEW "vw_activeTickets" AS
SELECT pk_ticket, title, description, status
FROM   "Ticket"
WHERE  status IN ('open', 'pending');


CREATE VIEW "vw_ticketStatusSummary" AS
SELECT status,
       COUNT(*) AS "ticketCount",
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "Ticket"), 1) AS percentage
FROM   "Ticket"
GROUP  BY status;


-- ============================================================
--  SAMPLE DATA
-- ============================================================
--  Inserted as 'open' first, then moved along the workflow with
--  plain UPDATEs, so the trigger accepts every step.

INSERT INTO "Ticket" (title, description) VALUES
    ('Cannot log in to Moodle',
     'Since this morning Moodle says "invalid session" after I enter my password. Cleared cookies, same problem in Firefox and Edge.'),
    ('Printer in room B2.14 jams',
     'The HP LaserJet in B2.14 jams on every double-sided print job. Single-sided works.'),
    ('Request: VPN access for remote lab',
     'I need VPN access to reach the Linux lab servers from home for the CCNA project. Student ID 2024-0117.'),
    ('Outlook keeps asking for password',
     'Outlook on the school laptop asks for my password every 10 minutes since the Windows update.'),
    ('Projector has no signal (A1.03)',
     'HDMI cable connected, laptop detects the projector, but the screen shows "No signal". Tried two laptops.'),
    ('Wi-Fi drops in the library',
     'eduroam disconnects every few minutes on the 2nd floor of the library. Works fine on the ground floor.'),
    ('Teams meeting recordings missing',
     'The recording of yesterday''s BASDO2 lecture does not show up in the Teams channel.'),
    ('New monitor for reception desk',
     'The reception monitor flickers and has a dead line of pixels. Please replace it.'),
    ('Password reset for guest account',
     'Guest account "guest-lab3" is locked after too many attempts. Needed for tomorrow''s workshop.'),
    ('PostgreSQL service will not start on lab VM',
     'postgresql@16-main fails with "could not bind IPv4 address: Address already in use" on VM lab-db-07.'),
    ('Keyboard missing keys in C1.05',
     'PC number 12 in C1.05 is missing the F and J keys.'),
    ('Shared drive almost full',
     'The S: drive for the informatics department shows 98% used. Students can no longer save projects.'),
    ('Install Node.js 22 on lab PCs',
     'Please install Node.js 22 LTS on all PCs in room C1.05 for the web development course.'),
    ('Phishing email received',
     'Received an email pretending to be IT support asking to "verify my mailbox". Forwarded it as attachment.'),
    ('Laptop battery swollen',
     'The battery of loan laptop LT-044 is visibly swollen and the touchpad does not click anymore.');

-- pending: waiting for information or parts
UPDATE "Ticket" SET status = 'pending'  WHERE pk_ticket IN (3, 8, 15);

-- resolved: fix delivered, waiting for the requester to confirm
UPDATE "Ticket" SET status = 'resolved' WHERE pk_ticket IN (2, 5, 9, 14);

-- closed: confirmed and archived
UPDATE "Ticket" SET status = 'resolved' WHERE pk_ticket IN (7, 11, 13);
UPDATE "Ticket" SET status = 'closed'   WHERE pk_ticket IN (7, 11, 13);


-- ============================================================
--  APPLICATION ACCOUNT
-- ============================================================
--  A login for your API / app, so it does not use "postgres".
--  It can read and write tickets and run every routine, but
--  cannot change the structure. Change the password.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'helpdesk_app') THEN
        CREATE ROLE helpdesk_app LOGIN PASSWORD 'ChangeMe_2026!';
    END IF;
END;
$$;

GRANT CONNECT ON DATABASE helpdesk TO helpdesk_app;
GRANT USAGE ON SCHEMA public TO helpdesk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Ticket" TO helpdesk_app;
GRANT SELECT ON "vw_activeTickets", "vw_ticketStatusSummary" TO helpdesk_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO helpdesk_app;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO helpdesk_app;


-- ============================================================
--  USAGE EXAMPLES  (psql)
-- ============================================================
--  Procedures: pass NULL for each OUT parameter; the OUT values
--  come back as a result row.
--
--  CALL sp_createTicket('Mouse not working', 'Wireless mouse in C1.05 PC 4 is dead.', NULL, NULL);
--  CALL sp_resolveTicket(1, NULL);
--  CALL sp_updateTicketStatus(3, 'closed', NULL);        -- INVALID_TRANSITION
--  CALL sp_closeResolvedTickets(NULL);
--
--  Functions: use them like a table.
--
--  SELECT * FROM fn_getTicket(1);
--  SELECT * FROM fn_getTicketsByStatus('pending');
--  SELECT * FROM fn_searchTickets('lab');
--  SELECT * FROM fn_searchTickets('password', 'open');
--  SELECT * FROM fn_countTicketsByStatus();
--  SELECT * FROM "vw_activeTickets";
--  SELECT * FROM "vw_ticketStatusSummary";