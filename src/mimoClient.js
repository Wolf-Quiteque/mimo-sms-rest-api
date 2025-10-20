import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MIMO_BASE_URL = process.env.MIMO_BASE_URL?.replace(/\/+$/,"") || "http://52.30.114.86:8080";
const MIMO_TOKEN = process.env.MIMO_TOKEN;
const MIMO_DEFAULT_SENDER = process.env.MIMO_DEFAULT_SENDER; // e.g., approved Sender ID like "KAYELA"

if (!MIMO_TOKEN) {
  console.warn("[WARN] MIMO_TOKEN is not set. Requests will fail until it's configured.");
}
if (!MIMO_DEFAULT_SENDER) {
  console.warn("[WARN] MIMO_DEFAULT_SENDER is not set. You can pass 'sender' in the request body or set the env var.");
}

/**
 * Sends an SMS via MIMO SMS.
 * Docs show two options (POST body JSON or GET query). We use POST JSON for clarity.
 * Endpoint: POST /mimosms/v1/message/send?token=... 
 * Body: { sender, recipients, text }
 */
export async function sendSms({ recipients, text, senderOverride }) {
  const sender = senderOverride || MIMO_DEFAULT_SENDER;
  if (!sender) {
    throw new Error("No sender configured. Provide 'MIMO_DEFAULT_SENDER' env var or send 'sender' in request body.");
  }
  if (!MIMO_TOKEN) {
    throw new Error("MIMO_TOKEN env var not set.");
  }

  const url = `${MIMO_BASE_URL}/mimosms/v1/message/send`;
  const params = { token: MIMO_TOKEN };
  const payload = { sender, recipients, text };

  const { data } = await axios.post(url, payload, { params, timeout: 20000 });
  return data;
}
