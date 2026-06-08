import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MIMO_BASE_URL = process.env.MIMO_BASE_URL?.replace(/\/+$/,"") || "http://52.30.114.86:8080";
const MIMO_SEND_PATH = process.env.MIMO_SEND_PATH || "/mimosms/v1/message/send";
const MIMO_TOKEN = process.env.MIMO_TOKEN;
const MIMO_DEFAULT_SENDER = process.env.MIMO_DEFAULT_SENDER; // e.g., approved Sender ID like "KAYELA"
const MIMO_TIMEOUT_MS = Number.parseInt(process.env.MIMO_TIMEOUT_MS || "20000", 10);
const MIMO_RETRIES = Number.parseInt(process.env.MIMO_RETRIES || "1", 10);
const CONNECTIVITY_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
]);

if (!MIMO_TOKEN) {
  console.warn("[WARN] MIMO_TOKEN is not set. Requests will fail until it's configured.");
}
if (!MIMO_DEFAULT_SENDER) {
  console.warn("[WARN] MIMO_DEFAULT_SENDER is not set. You can pass 'sender' in the request body or set the env var.");
}

export class MimoProviderError extends Error {
  constructor(message, { status = 502, code = "MIMO_PROVIDER_ERROR", providerStatus, providerResponse } = {}) {
    super(message);
    this.name = "MimoProviderError";
    this.status = status;
    this.code = code;
    this.providerStatus = providerStatus;
    this.providerResponse = providerResponse;
  }
}

function getPositiveInteger(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getNonNegativeInteger(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getSendUrl() {
  if (process.env.MIMO_SEND_URL) {
    return process.env.MIMO_SEND_URL;
  }

  const path = MIMO_SEND_PATH.startsWith("/") ? MIMO_SEND_PATH : `/${MIMO_SEND_PATH}`;
  return `${MIMO_BASE_URL}${path}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toMimoProviderError(error) {
  if (error instanceof MimoProviderError) {
    return error;
  }

  if (error.response) {
    return new MimoProviderError("Mimo provider rejected the SMS request.", {
      status: error.response.status || 502,
      code: "MIMO_PROVIDER_RESPONSE",
      providerStatus: error.response.status,
      providerResponse: error.response.data,
    });
  }

  if (CONNECTIVITY_ERROR_CODES.has(error.code)) {
    return new MimoProviderError("Mimo provider is unreachable or timed out.", {
      status: 504,
      code: error.code,
    });
  }

  return new MimoProviderError("Could not send SMS through Mimo provider.", {
    status: 502,
    code: error.code || "MIMO_PROVIDER_ERROR",
  });
}

export function getMimoConfigStatus() {
  let sendUrl;
  try {
    sendUrl = new URL(getSendUrl());
  } catch {
    sendUrl = null;
  }

  return {
    providerHost: sendUrl?.host || "invalid-url",
    providerProtocol: sendUrl?.protocol.replace(":", "") || "invalid",
    hasToken: Boolean(MIMO_TOKEN),
    hasDefaultSender: Boolean(MIMO_DEFAULT_SENDER),
    timeoutMs: getPositiveInteger(MIMO_TIMEOUT_MS, 20000),
    retries: getNonNegativeInteger(MIMO_RETRIES, 1),
  };
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

  const sendUrl = getSendUrl();
  const params = { token: MIMO_TOKEN };
  const payload = { sender, recipients, text };
  const timeout = getPositiveInteger(MIMO_TIMEOUT_MS, 20000);
  const retries = getNonNegativeInteger(MIMO_RETRIES, 1);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data } = await axios.post(sendUrl, payload, { params, timeout });
      return data;
    } catch (error) {
      const providerError = toMimoProviderError(error);
      const canRetry = attempt < retries && providerError.status >= 500;
      if (!canRetry) {
        throw providerError;
      }
      await wait(500 * (attempt + 1));
    }
  }
}
