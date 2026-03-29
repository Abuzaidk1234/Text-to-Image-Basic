const API_ENDPOINT = "/api/generate";
const HISTORY_KEY = "prompt-canvas-history";

const stylePrompts = {
  none: "",
  cinematic: "cinematic lighting, dramatic composition, rich detail",
  anime: "anime illustration, expressive lines, vibrant colors",
  pixel: "pixel art, 8-bit inspired, crisp retro game aesthetic",
  watercolor: "watercolor painting, soft edges, textured brush strokes",
  poster: "graphic poster design, clean layout, bold shapes, modern visual hierarchy",
};

const ratioSizes = {
  square: { width: 1024, height: 1024, label: "1:1" },
  portrait: { width: 832, height: 1216, label: "portrait" },
  landscape: { width: 1216, height: 832, label: "landscape" },
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

let currentImageUrl = "";
let currentPrompt = "";
let currentSeed = "";

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

function buildImageUrl({ prompt, style, ratio, seed, cacheBust = true }) {
  const fullPrompt = buildPrompt(prompt, style);
  const size = ratioSizes[ratio] || ratioSizes.square;
  const url = new URL(API_ENDPOINT, window.location.origin);

  url.searchParams.set("prompt", prompt);
  url.searchParams.set("style", style);
  url.searchParams.set("ratio", ratio);
  url.searchParams.set("seed", String(seed));

  if (cacheBust) {
    url.searchParams.set("v", String(Date.now()));
  }

  return { url: url.toString(), fullPrompt, size };
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

async function readApiError(url) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => null);

    if (data?.error) {
      return data.error;
    }
  } catch (error) {
    return "The local API route is not available. Deploy this project on Vercel to use generation.";
  }

  return "The image could not be loaded.";
}

function loadGeneratedImage(url) {
  return new Promise((resolve, reject) => {
    const loader = new Image();
    loader.onload = () => resolve(url);
    loader.onerror = async () => {
      const message = await readApiError(url);
      reject(new Error(message));
    };
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

  const { url, fullPrompt, size } = buildImageUrl({ prompt, style, ratio, seed, cacheBust: true });
  const historyUrl = buildImageUrl({ prompt, style, ratio, seed, cacheBust: false }).url;
  const styleLabel = styleSelect.options[styleSelect.selectedIndex].text;

  setLoadingState(true);
  setStatus("Generating image... this can take a few seconds.");
  resultMeta.textContent = `Model: Flux | ${size.width}x${size.height} | seed ${seed}`;

  try {
    const resolvedUrl = await loadGeneratedImage(url);

    currentImageUrl = resolvedUrl;
    currentPrompt = prompt;
    currentSeed = seed;

    showResult(resolvedUrl);
    downloadButton.disabled = false;
    setStatus("Image generated successfully.");

    addToHistory({
      id: `${Date.now()}-${seed}`,
      prompt,
      style,
      styleLabel,
      ratio,
      seed,
      url: historyUrl,
    });

    resultMeta.textContent = `Prompt used: "${fullPrompt}" | ${size.label} | seed ${seed}`;
  } catch (error) {
    currentImageUrl = "";
    downloadButton.disabled = true;
    setStatus(error instanceof Error ? error.message : "Image generation failed.");
    resultMeta.textContent = "This version expects a free Vercel deployment with the built-in /api/generate route.";
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

if (window.location.protocol === "file:") {
  setStatus("The page UI works locally, but image generation needs the free Vercel deployment.");
  resultMeta.textContent = "Open this project from a Vercel deployment so /api/generate is available.";
}

renderHistory();
