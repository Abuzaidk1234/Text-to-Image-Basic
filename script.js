const API_ROUTE = "/api/generate";
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
  anime: [
    "Anything v5",
    "Anything Diffusion",
    "Animagine XL",
    "Anime Illust Diffusion XL",
    "Eimis Anime Diffusion",
    "Dreamshaper",
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
};

const stylePrompts = {
  none: "",
  anime: "anime illustration, expressive lines, vibrant colors",
  watercolor: "watercolor painting, soft edges, textured brush strokes",
};

const ratioSizes = {
  square: { width: 512, height: 512, label: "1:1" },
  portrait: { width: 448, height: 640, label: "portrait" },
  landscape: { width: 640, height: 448, label: "landscape" },
};

const surprisePrompts = [
  {
    prompt: "A sunrise over floating temples above soft clouds, atmospheric fantasy landscape",
    style: "none",
    ratio: "portrait",
  },
  {
    prompt: "A cat running a tiny bakery at sunrise, cozy fantasy illustration",
    style: "watercolor",
    ratio: "square",
  },
  {
    prompt: "A glowing koi pond under lantern light, serene anime background art",
    style: "anime",
    ratio: "landscape",
  },
  {
    prompt: "A peaceful mountain village in spring, watercolor travel-journal feeling",
    style: "watercolor",
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
const showcaseImages = document.querySelectorAll(".showcase-image[data-gallery-base]");
const historyGrid = document.querySelector("#history-grid");
const clearHistoryButton = document.querySelector("#clear-history-btn");
const promptInsertButtons = document.querySelectorAll("[data-prompt]");
const themeToggleButton = document.querySelector("#theme-toggle");

let currentImageUrl = "";
let currentPrompt = "";
let currentSeed = "";
let modelStatusCache = null;
let modelStatusFetchedAt = 0;

resultImage.addEventListener("error", () => {
  showEmptyState();
  setStatus("Image preview could not be loaded.");
});

function isLocalFileMode() {
  return window.location.protocol === "file:";
}

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

function getHistoryEntryById(entryId) {
  return getHistory().find((item) => item.id === entryId);
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

function buildApiUrl(action, id = "") {
  const baseOrigin = isLocalFileMode() ? "http://localhost" : window.location.origin;
  const url = new URL(API_ROUTE, baseOrigin);
  url.searchParams.set("action", action);

  if (id) {
    url.searchParams.set("id", id);
  }

  return url.toString();
}

async function getLiveModels() {
  if (modelStatusCache && Date.now() - modelStatusFetchedAt < MODEL_CACHE_MS) {
    return modelStatusCache;
  }

  const response = await fetch(buildApiUrl("models"));
  const data = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error("Could not fetch the live AI Horde model queue.");
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

function initializeShowcaseImages() {
  const extensions = ["webp", "png", "jpg", "jpeg", "avif"];

  showcaseImages.forEach((image) => {
    image.addEventListener("error", () => {
      const basePath = image.dataset.galleryBase || "";
      const currentIndex = Number(image.dataset.galleryExtIndex || "0");
      const nextIndex = currentIndex + 1;

      if (!basePath || nextIndex >= extensions.length) {
        image.alt = "Showcase image could not be loaded";
        return;
      }

      image.dataset.galleryExtIndex = String(nextIndex);
      image.src = `${basePath}.${extensions[nextIndex]}`;
    });
  });
}

function closeHistoryMenus() {
  historyGrid.querySelectorAll(".history-menu[open]").forEach((menu) => {
    menu.removeAttribute("open");
  });
}

function getHistoryColumns() {
  return window.matchMedia("(max-width: 1024px)").matches ? 1 : 3;
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

  const columns = getHistoryColumns();
  const lastRowCount = history.length % columns || columns;
  const lastRowStartIndex = history.length - lastRowCount;

  history.forEach((item, index) => {
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

    const header = document.createElement("div");
    header.className = "history-card-header";

    const prompt = document.createElement("p");
    prompt.className = "history-prompt";
    prompt.textContent = item.prompt;

    const menu = document.createElement("details");
    menu.className = "history-menu";

    if (index >= lastRowStartIndex) {
      menu.classList.add("history-menu-up");
    }

    const menuToggle = document.createElement("summary");
    menuToggle.className = "history-menu-trigger";
    menuToggle.setAttribute("aria-label", "Open actions menu");
    menuToggle.textContent = "⋯";

    const menuList = document.createElement("div");
    menuList.className = "history-menu-list";

    const reuseAction = document.createElement("button");
    reuseAction.className = "history-menu-item";
    reuseAction.type = "button";
    reuseAction.dataset.historyAction = "reuse";
    reuseAction.dataset.historyIndex = item.id;
    reuseAction.textContent = "Reuse prompt";

    const downloadAction = document.createElement("button");
    downloadAction.className = "history-menu-item";
    downloadAction.type = "button";
    downloadAction.dataset.historyAction = "download";
    downloadAction.dataset.historyIndex = item.id;
    downloadAction.textContent = "Download image";

    const deleteAction = document.createElement("button");
    deleteAction.className = "history-menu-item history-menu-item-danger";
    deleteAction.type = "button";
    deleteAction.dataset.historyAction = "delete";
    deleteAction.dataset.historyIndex = item.id;
    deleteAction.textContent = "Delete";

    menuList.append(reuseAction, downloadAction, deleteAction);
    menu.append(menuToggle, menuList);

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = `style: ${item.styleLabel} | seed: ${item.seed}`;

    header.append(prompt, menu);
    content.append(header, meta);
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

function deleteHistoryEntry(entryId) {
  const nextHistory = getHistory().filter((item) => item.id !== entryId);
  saveHistory(nextHistory);
  renderHistory();
}

async function downloadImage(url, prompt, seed) {
  if (!url) {
    return;
  }

  try {
    setStatus("Preparing download...");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${slugify(prompt)}-${seed}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    setStatus("Image downloaded.");
  } catch (error) {
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Opened the image in a new tab so you can save it manually.");
  }
}

async function downloadCurrentImage() {
  if (!currentImageUrl) {
    return;
  }

  try {
    downloadButton.disabled = true;
    await downloadImage(currentImageUrl, currentPrompt, currentSeed);
  } finally {
    downloadButton.disabled = false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestGeneration(requestBody) {
  const response = await fetch(API_ROUTE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

async function waitForGeneration(id) {
  const startedAt = Date.now();
  const timeoutMs = 180000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(buildApiUrl("check", id));
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

  throw new Error("Generation took too long on the queue. Please try again.");
}

async function fetchGenerationResult(id) {
  const response = await fetch(buildApiUrl("status", id));
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
async function generateWithAiHorde({ prompt, style, ratio, seed }) {
  const selectedModel = await chooseBestModel(style);

  if (typeof selectedModel.eta === "number" && selectedModel.eta > 180) {
    throw new Error("The AI Horde queue is overloaded right now. Please try again in a minute.");
  }

  const { fullPrompt, size, requestBody } = buildImageRequest({
    prompt,
    style,
    ratio,
    seed,
    modelName: selectedModel.name,
  });

  setStatus(`Using ${selectedModel.name}. Sending request through the secured backend...`);
  resultMeta.textContent = `Model: ${selectedModel.name} | ${size.width}x${size.height} | seed ${seed}`;

  const generationId = await requestGeneration(requestBody);
  await waitForGeneration(generationId);
  const generation = await fetchGenerationResult(generationId);
  const resolvedUrl = await loadImageUrl(generation.img);
  const usedSeed = generation.seed || String(seed);

  return {
    modelName: selectedModel.name,
    promptUsed: fullPrompt,
    resolvedUrl,
    resultMeta: `Prompt used: "${fullPrompt}" | ${size.label} | seed ${usedSeed}`,
    usedSeed,
  };
}

async function generateImage(event) {
  event.preventDefault();

  if (isLocalFileMode()) {
    setStatus("Live generation now runs through /api/generate. Open the deployed site or run a serverless dev setup.");
    resultMeta.textContent = "This secured version needs a backend route, so opening index.html directly will not generate images.";
    showEmptyState();
    return;
  }

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
  setStatus("Checking the fastest available AI Horde model...");

  try {
    const styleLabel = styleSelect.options[styleSelect.selectedIndex].text;
    const generation = await generateWithAiHorde({ prompt, style, ratio, seed });

    currentImageUrl = generation.resolvedUrl;
    currentPrompt = prompt;
    currentSeed = generation.usedSeed;

    showResult(generation.resolvedUrl);
    downloadButton.disabled = false;
    setStatus("Image generated successfully.");

    addToHistory({
      id: `${Date.now()}-${seed}`,
      prompt,
      style,
      styleLabel,
      ratio,
      seed: generation.usedSeed,
      url: generation.resolvedUrl,
    });

    resultMeta.textContent = generation.resultMeta;
  } catch (error) {
    currentImageUrl = "";
    downloadButton.disabled = true;
    setStatus(error instanceof Error ? error.message : "Image generation failed.");
    resultMeta.textContent =
      "This version uses a protected AI Horde backend, but queue times can still vary when the community network is busy.";
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

promptInsertButtons.forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt || "";

    if (button.dataset.style) {
      styleSelect.value = button.dataset.style;
    }

    if (button.dataset.ratio) {
      ratioSelect.value = button.dataset.ratio;
    }

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

  if (target.closest(".history-menu-trigger")) {
    window.setTimeout(() => {
      const activeMenu = target.closest(".history-menu");

      historyGrid.querySelectorAll(".history-menu[open]").forEach((menu) => {
        if (menu !== activeMenu) {
          menu.removeAttribute("open");
        }
      });
    }, 0);
    return;
  }

  const entryId = target.getAttribute("data-history-index");
  if (!entryId) {
    return;
  }

  const action = target.getAttribute("data-history-action") || "reuse";
  const entry = getHistoryEntryById(entryId);
  if (!entry) {
    return;
  }

  closeHistoryMenus();

  if (action === "delete") {
    deleteHistoryEntry(entryId);
    setStatus("Previous creation deleted.");
    return;
  }

  if (action === "download") {
    downloadImage(entry.url, entry.prompt, entry.seed);
    return;
  }

  promptInput.value = entry.prompt;
  styleSelect.value = entry.style;
  ratioSelect.value = entry.ratio;
  seedInput.value = String(entry.seed);
  setStatus("Previous prompt restored. Generate again to reproduce the image.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (target instanceof Node && historyGrid.contains(target)) {
    return;
  }

  closeHistoryMenus();
});

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", toggleTheme);
}

window.addEventListener("resize", renderHistory);

loadSavedTheme();
initializeShowcaseImages();
renderHistory();
