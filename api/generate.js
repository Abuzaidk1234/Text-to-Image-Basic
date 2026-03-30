const HORDE_BASE = "https://aihorde.net/api/v2";
const DEFAULT_API_KEY = "0000000000";
const DEFAULT_CLIENT_AGENT = "PromptCanvas/2.0 (secure proxy)";

function getApiKey() {
  return process.env.HORDE_API_KEY || DEFAULT_API_KEY;
}

function getClientAgent() {
  return process.env.HORDE_CLIENT_AGENT || DEFAULT_CLIENT_AGENT;
}

function readJsonBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  return req.body;
}

async function hordeFetch(path, options = {}) {
  const headers = {
    apikey: getApiKey(),
    "Client-Agent": getClientAgent(),
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${HORDE_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  return { response, data };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const action = String(req.query.action || "");

      if (action === "models") {
        const { response, data } = await hordeFetch("/status/models?type=image");
        return res.status(response.status).json(data || { error: "Could not fetch model data." });
      }

      if (action === "check") {
        const id = String(req.query.id || "").trim();
        if (!id) {
          return res.status(400).json({ error: "Missing generation id." });
        }

        const { response, data } = await hordeFetch(`/generate/check/${encodeURIComponent(id)}`);
        return res.status(response.status).json(data || { error: "Could not fetch queue status." });
      }

      if (action === "status") {
        const id = String(req.query.id || "").trim();
        if (!id) {
          return res.status(400).json({ error: "Missing generation id." });
        }

        const { response, data } = await hordeFetch(`/generate/status/${encodeURIComponent(id)}`);
        return res.status(response.status).json(data || { error: "Could not fetch generation result." });
      }

      return res.status(400).json({ error: "Unknown action." });
    }

    if (req.method === "POST") {
      const payload = readJsonBody(req);

      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Missing generation payload." });
      }

      const { response, data } = await hordeFetch("/generate/async", {
        method: "POST",
        body: payload,
      });

      return res
        .status(response.status)
        .json(data || { error: "Could not submit the generation request." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected server error.",
    });
  }
};
