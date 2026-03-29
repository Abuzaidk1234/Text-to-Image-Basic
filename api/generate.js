const stylePrompts = {
  none: "",
  cinematic: "cinematic lighting, dramatic composition, rich detail",
  anime: "anime illustration, expressive lines, vibrant colors",
  pixel: "pixel art, 8-bit inspired, crisp retro game aesthetic",
  watercolor: "watercolor painting, soft edges, textured brush strokes",
  poster: "graphic poster design, clean layout, bold shapes, modern visual hierarchy",
};

const ratioSizes = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
};

function buildPrompt(prompt, style) {
  const styleHint = stylePrompts[style] || "";
  return styleHint ? `${prompt}, ${styleHint}` : prompt;
}

function buildCandidateUrls(fullPrompt, size, seed) {
  const builders = [
    () => {
      const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(fullPrompt)}`);
      url.searchParams.set("model", "flux");
      url.searchParams.set("width", String(size.width));
      url.searchParams.set("height", String(size.height));
      url.searchParams.set("seed", String(seed));
      return url.toString();
    },
    () => {
      const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
      url.searchParams.set("model", "flux");
      url.searchParams.set("width", String(size.width));
      url.searchParams.set("height", String(size.height));
      url.searchParams.set("seed", String(seed));
      url.searchParams.set("nologo", "true");
      url.searchParams.set("safe", "true");
      return url.toString();
    },
    () => {
      const url = new URL(`https://pollinations.ai/p/${encodeURIComponent(fullPrompt)}`);
      url.searchParams.set("seed", String(seed));
      return url.toString();
    },
  ];

  return builders.map((build) => build());
}

function sanitizeSeed(seedValue) {
  const parsed = Number(seedValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.floor(Math.random() * 1_000_000_000) + 1;
  }
  return Math.floor(parsed);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const prompt = String(req.query.prompt || "").trim();
  const style = String(req.query.style || "none");
  const ratio = String(req.query.ratio || "square");
  const seed = sanitizeSeed(req.query.seed);
  const size = ratioSizes[ratio] || ratioSizes.square;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  const fullPrompt = buildPrompt(prompt, style);
  const candidates = buildCandidateUrls(fullPrompt, size, seed);
  const failures = [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          "User-Agent": "PromptCanvas Student Project/1.0",
          "Accept": "image/*",
        },
        redirect: "follow",
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.startsWith("image/")) {
        failures.push({
          url: candidate,
          status: response.status,
          contentType,
        });
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("X-Prompt-Seed", String(seed));
      res.setHeader("X-Image-Source", new URL(candidate).hostname);
      res.status(200).send(buffer);
      return;
    } catch (error) {
      failures.push({
        url: candidate,
        message: error instanceof Error ? error.message : "Unknown fetch error",
      });
    }
  }

  res.status(502).json({
    error: "Image generation failed on all free endpoints.",
    seed,
    failures,
  });
};
