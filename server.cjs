const express = require("express");
const ticketRouter = require("./routes/tickets.cjs");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

// 1. Request logging. This runs before the routes.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
});

// 2. Parse application/json request bodies, up to 32 KB.
app.use(express.json({ limit: "32kb" }));

// 3. Small health check and the mounted ticket router.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "fuweb-helpdesk-api" });
});
app.use("/api/tickets", ticketRouter);

// 4. Fallback only if no route matched.
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "No route matches this request" }
  });
});

// 5. Error handler. Invalid JSON is a client error, not a server crash.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body contains invalid JSON" }
    });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "JSON request body is too large" }
    });
  }
  console.error("Unexpected server error:", err);
  if (res.headersSent) return next(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected server error" }
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, error => {
    if (error) {
      console.error("Could not start the API:", error.message);
      process.exitCode = 1;
      return;
    }
    console.log(`FUWEB Helpdesk API running at http://${HOST}:${PORT}`);
    console.log("Stop the server with Ctrl+C. Restart to restore the sample tickets.");
  });
}

module.exports = app;
