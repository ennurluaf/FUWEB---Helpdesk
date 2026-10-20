# **notes/week-0.md copy**

## **A · Mapping the Application**

### **Which code runs where**
- **server.cjs** → runs **on the server (Node.js + Express)**  
  - Defines Express routes  
  - Stores the in‑memory `tickets` array  
  - Responds to HTTP requests with JSON  
- **public/index.html** → runs **in the browser**  
  - Static HTML page  
  - Loads `app.js`  
- **public/app.js** → runs **in the browser**  
  - Sends `fetch()` requests to the server  
  - Renders ticket data into the DOM

### **Request/Response Diagram**

```
Browser (app.js)
    ↓  HTTP GET /tickets
Express server (server.cjs)
    ↓  Route handler: app.get("/tickets")
Tickets array (in-memory JS array)
    ↓  JSON response
Browser receives JSON
    ↓  DOM update → visible ticket list
```

### **Data format**
- **Request:** HTTP GET  
- **Response:** `Content-Type: application/json`  
- **Payload:** `[{ id: 1, title: "...", ... }, ...]`

### **Why the array is not a database**
- It lives **only in RAM**, not on disk.  
- No persistence, no queries, no storage engine.  
- When the server restarts, the array resets to whatever is hard‑coded in `server.cjs`.

### **Prediction**
> **Any changes made in memory disappear when the server restarts.**  
The array returns to its original hard‑coded values.

---

## **B · Investigating the Broken Page**

### **Expected behavior**
Clicking **Load tickets** should:
- Send a GET request to `/tickets`
- Receive a JSON array
- Display the tickets on the page

### **Actual behavior (before fix)**
- Button does nothing visually  
- No tickets appear  
- Browser console shows **404 Not Found**

### **Network inspection**
After clicking again:

| Field | Observation |
|-------|-------------|
| **Method** | GET |
| **URL** | `/ticket` (wrong) |
| **Status** | 404 |
| **Response** | Express default HTML 404 page |

### **Server terminal**
Shows:
```
GET /ticket 404
```

### **Mismatch**
- **app.js requests:** `/ticket`  
- **server.cjs route:** `/tickets`

### **Targeted correction**
In **public/app.js**, change:

```js
fetch("/api/ticket")
```

to:

```js
fetch("/api/tickets")
```

### **Retest**
- Reload page  
- Click **Load tickets**  
- Network shows **200 OK**  
- Response is JSON array  
- Tickets appear on screen

### **Symptom → Evidence → Cause → Fix → Retest**

- **Symptom:** No tickets displayed  
- **Evidence:** Network tab shows GET `/ticket` → 404  
- **Cause:** Wrong path in `app.js`  
- **Fix:** Change `/ticket` → `/tickets`  
- **Retest:** Tickets load correctly with status 200 and JSON

---

## **C · Modify and Observe**

### **Add a third ticket**
In `server.cjs`:

```js
{ id: 3, title: 'Monitor is flickering', description: 'Classroom C05, display issue.', status: 'completed' }
```

Restart server → reload page → **third ticket appears**.

### **Frontend improvements**
- Changed page heading text  
- Added small responsive CSS (e.g., flex layout, spacing)

### **Stopped server test**
Stop server → click **Load tickets**:

**New failure:**  
- Browser shows **Failed to fetch**  
- Network tab shows **no HTTP status** (because no response was received)  
- This is different from earlier 404 (which *was* a server response)

Restart server → page works again.

---

## **D · Making the Investigation Reproducible**

### **README.md content**
Includes:
- Installation steps  
- How to start the server (`node server.cjs`)  
- Expected URL: `http://localhost:3000`  
- How to test the endpoint

### **Test log (three cases)**

| Case | Expected | Observed |
|------|----------|----------|
| **Working request** | 200 + JSON | 200 + array of 3 tickets |
| **Wrong path** | 404 | 404 Not Found |
| **Stopped server** | Network error | `Failed to fetch` (no status) |

Restored correct path afterwards.

### **Partner feedback**
One instruction clarified:  
- Added explicit note: **“Run the server before opening index.html”**

---

## **Exit Ticket**
> **Which evidence tells you whether a failure happened before or after the server responded?**

- If the **server responded**, you see an **HTTP status** (e.g., 404).  
- If the **server never responded**, the browser shows **Failed to fetch** with **no status code**.