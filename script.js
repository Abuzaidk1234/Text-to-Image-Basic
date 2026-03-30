const HORDE_BASE = "https://aihorde.net/api/v2";
const HORDE_API_KEY = "0000000000";
const HISTORY_KEY = "prompt-canvas-history";
const THEME_KEY = "prompt-canvas-theme";
const MODEL_CACHE_MS = 60000;

const blockedModelWords = [
  "nsfw",
  "hentai",
  "furry",
  "yiff",
  "pony",
  "waifu",
  "babes",
  "illustrious",
  "ntr",
  "inpainting",
];

const preferredModelsByStyle = {
  none: [
    "Dreamshaper",
    "Realistic Vision",
    "Photon",
    "Experience",
    "FaeTastic",
    "Fantasy Card Diffusion",
    "Anything v5",
    "stable_diffusion",
  ],
  cinematic: [
    "Realistic Vision",
    "Photon",
    "Dreamshaper",
    "NeverEnding Dream",
    "AbsoluteReality",
    "Deliberate",
    "stable_diffusion",
  ],
  anime: [
    "Anything v5",
    "Anything Diffusion",
    "Animagine XL",
    "Anime Illust Diffusion XL",
    "Eimis Anime Diffusion",
    "Dreamshaper",
    "stable_diffusion",
  ],
  pixel: [
    "AIO Pixel Art",
    "App Icon Diffusion",
    "stable_diffusion",
  ],
  watercolor: [
    "FaeTastic",
    "Fantasy Card Diffusion",
    "Dreamshaper",
    "Experience",
    "Perfect World",
    "stable_diffusion",
  ],
  poster: [
    "App Icon Diffusion",
    "ModernArt Diffusion",
    "Photon",
    "Dreamshaper",
    "Anything v5",
    "stable_diffusion",
  ],
};

const stylePrompts = {
  none: "",
  cinematic: "cinematic lighting, dramatic composition, rich detail",
  anime: "anime illustration, expressive lines, vibrant colors",
  pixel: "pixel art, 8-bit inspired, crisp retro game aesthetic",
  watercolor: "watercolor painting, soft edges, textured brush strokes",
  poster: "graphic poster design, clean layout, bold shapes, modern visual hierarchy",
};

const ratioSizes = {
  square: { width: 512, height: 512, label: "1:1" },
  portrait: { width: 448, height: 640, label: "portrait" },
  landscape: { width: 640, height: 448, label: "landscape" },
};

const surprisePrompts = [
  {
    prompt: "A solar-powered classroom on Mars, educational infographic style",
    style: "poster",
    ratio: "portrait",
  },
  {
    prompt: "A cat running a tiny bakery at sunrise, cozy fantasy illustration",
    style: "watercolor",
    ratio: "square",
  },
  {
    prompt: "A neon bicycle racing through a digital city, motion blur, rainy night",
    style: "cinematic",
    ratio: "landscape",
  },
  {
    prompt: "An eco-friendly smart village in 2050, bright and optimistic",
    style: "anime",
    ratio: "landscape",
  },
];

const form = document.querySelector("#generator-form");
const promptInput = document.querySelector("#prompt");
const styleSelect = document.querySelector("#style");
const ratioSelect = document.querySelector("#ratio");
const seedInput = document.querySelector("#seed");
const generateButton = document.querySelector("#generate-btn");
const surpriseButton = document.querySelector("#surprise-btn");
const downloadButton = document.querySelector("#download-btn");
const statusText = document.querySelector("#status-text");
const resultMeta = document.querySelector("#result-meta");
const previewFrame = document.querySelector("#preview-frame");
const emptyState = document.querySelector("#empty-state");
const resultImage = document.querySelector("#result-image");
const historyGrid = document.querySelector("#history-grid");
const clearHistoryButton = document.querySelector("#clear-history-btn");
const chips = document.querySelectorAll(".chip");
const themeToggleButton = document.querySelector("#theme-toggle");

let currentImageUrl = "";
let currentPrompt = "";
let currentSeed = "";
let modelStatusCache = null;
let modelStatusFetchedAt = 0;

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = nextTheme;

  if (themeToggleButton) {
    themeToggleButton.textContent = nextTheme === "dark" ? "Day Mode" : "Night Mode";
    themeToggleButton.setAttribute(
      "aria-label",
      nextTheme === "dark" ? "Switch to day mode" : "Switch to night mode"
    );
  }
}

function loadSavedTheme() {
  try {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
  } catch (error) {
    applyTheme("light");
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    // Ignore storage write failures and still switch the theme for the current session.
  }
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function buildPrompt(basePrompt, style) {
  const styleHint = stylePrompts[style];
  return styleHint ? `${basePrompt}, ${styleHint}` : basePrompt;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
}

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000) + 1;
}

function isModelAllowed(name) {
  const lower = name.toLowerCase();
  return !blockedModelWords.some((word) => lower.includes(word));
}

function normalizeEta(value) {
  return typeof value === "number" && value >= 0 ? value : Number.POSITIVE_INFINITY;
}

async function getLiveModels() {
  if (modelStatusCache && Date.now() - modelStatusFetchedAt < MODEL_CACHE_MS) {
    return modelStatusCache;
  }

  const response = await fetch(`${HORDE_BASE}/status/models?type=image`);
  const data = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error("Could not fetch the live free-model queue.");
  }

  modelStatusCache = data;
  modelStatusFetchedAt = Date.now();
  return data;
}

async function chooseBestModel(style) {
  const preferred = preferredModelsByStyle[style] || preferredModelsByStyle.none;
  const preferredLookup = new Map(preferred.map((name, index) => [name.toLowerCase(), index]));
  const models = await getLiveModels().catch(() => null);

  if (!Array.isArray(models) || !models.length) {
    return { name: "stable_diffusion", eta: null };
  }

  const sortBySpeedThenPreference = (a, b) => {
    const etaDifference = normalizeEta(a.eta) - normalizeEta(b.eta);
    if (etaDifference !== 0) {
      return etaDifference;
    }

    const queueDifference = Number(a.queued || 0) - Number(b.queued || 0);
    if (queueDifference !== 0) {
      return queueDifference;
    }

    const aPreferred = preferredLookup.has(String(a.name).toLowerCase()) ? preferredLookup.get(String(a.name).toLowerCase()) : 999;
    const bPreferred = preferredLookup.has(String(b.name).toLowerCase()) ? preferredLookup.get(String(b.name).toLowerCase()) : 999;
    if (aPreferred !== bPreferred) {
      return aPreferred - bPreferred;
    }

    return Number(b.count || 0) - Number(a.count || 0);
  };

  const candidates = models
    .filter((model) => model?.type === "image")
    .filter((model) => Number(model?.count) > 0 && Number(model?.performance) > 0)
    .filter((model) => isModelAllowed(String(model?.name || "")));

  const viableCandidates = candidates
    .filter((model) => normalizeEta(model.eta) < 10000)
    .sort(sortBySpeedThenPreference);

  const fastPreferredCandidates = viableCandidates
    .filter((model) => preferredLookup.has(String(model.name).toLowerCase()))
    .filter((model) => normalizeEta(model.eta) <= 120)
    .sort(sortBySpeedThenPreference);

  const bestCandidate = fastPreferredCandidates[0] || viableCandidates[0] || candidates.sort(sortBySpeedThenPreference)[0];
  if (!bestCandidate) {
    return { name: "stable_diffusion", eta: null };
  }

  return {
    name: bestCandidate.name,
    eta: typeof bestCandidate.eta === "number" ? bestCandidate.eta : null,
  };
}

function buildImageRequest({ prompt, style, ratio, seed, modelName }) {
  const fullPrompt = buildPrompt(prompt, style);
  const size = ratioSizes[ratio] || ratioSizes.square;
  const clientAgent = `PromptCanvas:1.0:${window.location.origin === "null" ? "local-file" : window.location.origin}`;

  return {
    fullPrompt,
    size,
    requestBody: {
      prompt: fullPrompt,
      params: {
        n: 1,
        width: size.width,
        height: size.height,
        steps: 12,
        seed: String(seed),
      },
      nsfw: false,
      censor_nsfw: true,
      r2: true,
      shared: false,
      replacement_filter: true,
      models: [modelName],
    },
    headers: {
      "Content-Type": "application/json",
      apikey: HORDE_API_KEY,
      "Client-Agent": clientAgent,
    },
  };
}

function setLoadingState(isLoading) {
  generateButton.disabled = isLoading;
  surpriseButton.disabled = isLoading;
  downloadButton.disabled = isLoading || !currentImageUrl;
  previewFrame.classList.toggle("is-loading", isLoading);
}

function setStatus(message) {
  statusText.textContent = message;
}

function showResult(url) {
  resultImage.src = url;
  resultImage.hidden = false;
  emptyState.hidden = true;
  previewFrame.classList.remove("is-empty");
  previewFrame.classList.add("has-image");
}

function showEmptyState() {
  resultImage.hidden = true;
  resultImage.removeAttribute("src");
  emptyState.hidden = false;
  previewFrame.classList.add("is-empty");
  previewFrame.classList.remove("has-image");
}

function renderHistory() {
  const history = getHistory();

  if (!history.length) {
    historyGrid.innerHTML = `
      <div class="history-empty">
        <p>Your latest generations will be saved here in this browser.</p>
      </div>
    `;
    return;
  }

  historyGrid.innerHTML = "";

  history.forEach((item) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const thumb = document.createElement("img");
    thumb.className = "history-thumb";
    thumb.alt = item.prompt;
    thumb.loading = "lazy";
    thumb.src = item.url;
    thumb.addEventListener(
      "error",
      () => {
        thumb.alt = "Previous image could not be reloaded";
      },
      { once: true }
    );

    const content = document.createElement("div");
    content.className = "history-content";

    const prompt = document.createElement("p");
    prompt.className = "history-prompt";
    prompt.textContent = item.prompt;

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = `style: ${item.styleLabel} | seed: ${item.seed}`;

    const action = document.createElement("button");
    action.className = "text-button history-action";
    action.type = "button";
    action.dataset.historyIndex = item.id;
    action.textContent = "Reuse prompt";

    content.append(prompt, meta, action);
    card.append(thumb, content);
    historyGrid.append(card);
  });
}

function addToHistory(entry) {
  const history = getHistory();
  const nextHistory = [entry, ...history].slice(0, 6);
  saveHistory(nextHistory);
  renderHistory();
}

function applyPromptPreset(preset) {
  promptInput.value = preset.prompt;
  styleSelect.value = preset.style;
  ratioSelect.value = preset.ratio;
  seedInput.value = "";
  promptInput.focus();
}

async function downloadCurrentImage() {
  if (!currentImageUrl) {
    return;
  }

  try {
    downloadButton.disabled = true;
    setStatus("Preparing download...");

    const response = await fetch(currentImageUrl);
    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${slugify(currentPrompt)}-${currentSeed}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    setStatus("Image downloaded.");
  } catch (error) {
    window.open(currentImageUrl, "_blank", "noopener,noreferrer");
    setStatus("Opened the image in a new tab so you can save it manually.");
  } finally {
    downloadButton.disabled = false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestGeneration(requestBody, headers) {
  const response = await fetch(`${HORDE_BASE}/generate/async`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "AI Horde rejected the generation request.");
  }

  if (!data?.id) {
    throw new Error("AI Horde did not return a generation ID.");
  }

  return data.id;
}

async function waitForGeneration(id, headers) {
  const startedAt = Date.now();
  const timeoutMs = 180000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${HORDE_BASE}/generate/check/${id}`, {
      headers: {
        apikey: headers.apikey,
        "Client-Agent": headers["Client-Agent"],
      },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Could not read AI Horde queue status.");
    }

    if (data?.faulted) {
      throw new Error("AI Horde faulted while generating the image. Please try again.");
    }

    if (data?.done) {
      return;
    }

    const queueText =
      typeof data?.queue_position === "number" && data.queue_position > 0
        ? `Queue position ${data.queue_position}. `
        : "";
    const etaText =
      typeof data?.wait_time === "number" && data.wait_time > 0
        ? `Approx ${Math.ceil(data.wait_time)}s remaining.`
        : "Waiting for a worker...";

    setStatus(`Generating image... ${queueText}${etaText}`.trim());
    await sleep(2500);
  }

  throw new Error("Generation took too long on the free queue. Please try again.");
}

async function fetchGenerationResult(id, headers) {
  const response = await fetch(`${HORDE_BASE}/generate/status/${id}`, {
    headers: {
      apikey: headers.apikey,
      "Client-Agent": headers["Client-Agent"],
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Could not fetch the final AI Horde result.");
  }

  const generation = data?.generations?.[0];
  if (!generation?.img) {
    throw new Error("AI Horde finished, but no image URL was returned.");
  }

  return generation;
}

function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const loader = new Image();
    loader.onload = () => resolve(url);
    loader.onerror = () => reject(new Error("The generated image URL could not be loaded."));
    loader.src = url;
  });
}

async function generateImage(event) {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  const style = styleSelect.value;
  const ratio = ratioSelect.value;

  if (!prompt) {
    setStatus("Please enter a prompt first.");
    promptInput.focus();
    return;
  }

  const seed = seedInput.value.trim() ? Number(seedInput.value.trim()) : randomSeed();
  seedInput.value = String(seed);

  setLoadingState(true);
  setStatus("Checking the fastest free model right now...");

  try {
    const selectedModel = await chooseBestModel(style);

    if (typeof selectedModel.eta === "number" && selectedModel.eta > 180) {
      throw new Error("The free queue is overloaded right now. Please try again in a minute.");
    }

    const { fullPrompt, size, requestBody, headers } = buildImageRequest({
      prompt,
      style,
      ratio,
      seed,
      modelName: selectedModel.name,
    });
    const styleLabel = styleSelect.options[styleSelect.selectedIndex].text;
    setStatus(`Using ${selectedModel.name}. Sending request to the free queue...`);
    resultMeta.textContent = `Model: ${selectedModel.name} | ${size.width}x${size.height} | seed ${seed}`;

    const generationId = await requestGeneration(requestBody, headers);
    await waitForGeneration(generationId, headers);
    const generation = await fetchGenerationResult(generationId, headers);
    const resolvedUrl = await loadImageUrl(generation.img);

    currentImageUrl = resolvedUrl;
    currentPrompt = prompt;
    currentSeed = generation.seed || String(seed);

    showResult(resolvedUrl);
    downloadButton.disabled = false;
    setStatus("Image generated successfully.");

    addToHistory({
      id: `${Date.now()}-${seed}`,
      prompt,
      style,
      styleLabel,
      ratio,
      seed: generation.seed || String(seed),
      url: resolvedUrl,
    });

    resultMeta.textContent = `Prompt used: "${fullPrompt}" | ${size.label} | seed ${currentSeed}`;
  } catch (error) {
    currentImageUrl = "";
    downloadButton.disabled = true;
    setStatus(error instanceof Error ? error.message : "Image generation failed.");
    resultMeta.textContent = "This version uses AI Horde's free community queue, so wait times can vary.";
    showEmptyState();
  } finally {
    setLoadingState(false);
  }
}

form.addEventListener("submit", generateImage);
downloadButton.addEventListener("click", downloadCurrentImage);

surpriseButton.addEventListener("click", () => {
  const preset = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
  applyPromptPreset(preset);
  setStatus("Preset loaded. Generate it or edit the text first.");
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    promptInput.value = chip.dataset.prompt || "";
    promptInput.focus();
    setStatus("Prompt inserted. You can generate it now.");
  });
});

clearHistoryButton.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
  setStatus("History cleared.");
});

historyGrid.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const entryId = target.getAttribute("data-history-index");
  if (!entryId) {
    return;
  }

  const entry = getHistory().find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  promptInput.value = entry.prompt;
  styleSelect.value = entry.style;
  ratioSelect.value = entry.ratio;
  seedInput.value = String(entry.seed);
  setStatus("Previous prompt restored. Generate again to reproduce the image.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", toggleTheme);
}

loadSavedTheme();
renderHistory();
