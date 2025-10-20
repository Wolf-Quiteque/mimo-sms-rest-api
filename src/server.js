import express from "express";
import morgan from "morgan";
import cors from "cors";
import { sendSms } from "./mimoClient.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Health check
app.get("/", (_req, res) => {
  res.json({
    name: "mimo-sms-rest-api",
    version: "1.0.0",
    status: "ok",
  });
});

/**
 * POST /send-sms
 * Body: { to: "9XXXXXXXX", text: "message" }
 * Optional: { sender: "MYID" } to override default sender for the request.
 */
app.post("/send-sms", async (req, res) => {
  try {
    const { to, text, sender } = req.body || {};
    if (!to || !text) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Fields 'to' and 'text' are required."
      });
    }

    // Very light validation/sanitization
    const recipients = String(to).replace(/\s+/g, "");
    const message = String(text).trim();
    if (!/^\d{7,15}(,\d{7,15})*$/.test(recipients)) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Field 'to' must be a phone number (or comma-separated list) containing 7-15 digits."
      });
    }
    if (message.length === 0 || message.length > 1000) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Field 'text' must be 1-1000 characters."
      });
    }

    const response = await sendSms({
      recipients,
      text: message,
      senderOverride: sender
    });

    res.status(200).json({
      ok: true,
      providerResponse: response
    });
  } catch (err) {
    console.error(err);
    const status = err.response?.status || 500;
    res.status(status).json({
      ok: false,
      error: err.response?.data || err.message || "Unknown error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`SMS API listening on http://localhost:${PORT}`);
});
