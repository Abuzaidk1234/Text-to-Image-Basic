# PromptCanvas Project Guide

This document explains how PromptCanvas was built, what technology stack it uses, which API it depends on, how image generation works, and how the web page is structured.

It is written as a learning guide so you can understand the project clearly and explain it confidently.

## 1. What This Project Is

PromptCanvas is a browser-based text-to-image generator.

The user:

- writes a prompt
- chooses a style
- selects an aspect ratio
- optionally enters a seed
- clicks generate

Then the app sends a request to a free public image-generation service and displays the generated image on the page.

## 2. Tech Stack Used

This project uses a very simple frontend stack:

- `HTML`
- `CSS`
- `JavaScript`

There is:

- no React
- no Node.js backend
- no database
- no build tool like Vite or Webpack
- no paid cloud service

### Why this stack was chosen

This stack was used because it is:

- easy to understand
- easy to host
- lightweight
- good for a mini project
- good for learning how frontend apps work without framework complexity

## 3. Files and Their Roles

### `index.html`

This file contains the page structure:

- page heading
- prompt input area
- style dropdown
- aspect ratio dropdown
- seed input
- generate button
- surprise button
- result preview area
- prompt chips
- recent creations section
- project credits section

### `styles.css`

This file controls the look of the website:

- colors
- layout
- spacing
- card styles
- buttons
- responsive design
- day and night themes
- recent creation menu styling

### `script.js`

This file contains the app logic:

- reading form values
- building prompts
- choosing a model
- calling the API
- checking queue status
- showing the final image
- saving recent creations
- theme switching
- download logic
- recent creations menu actions

### `README.md`

This is the GitHub-facing project description.

### `PROJECT_GUIDE.md`

This file explains how the project works technically.

## 4. Which API Is Used

The project uses the **AI Horde public API**.

AI Horde is a community-powered free AI generation service.

The app uses the anonymous public access flow, so there is no paid API key required.

### Important point

This project is **not offline**.

It still depends on an external public API to generate images.

So the correct description is:

> A frontend text-to-image web app that uses a free public AI image generation API.

## 5. Which API Endpoints Are Used

In `script.js`, the app uses these API flows:

### 1. Live model list

`GET https://aihorde.net/api/v2/status/models?type=image`

This is used to check which public image models are currently available and how busy they are.

### 2. Start image generation

`POST https://aihorde.net/api/v2/generate/async`

This creates a new generation request and returns a generation ID.

### 3. Check generation status

`GET https://aihorde.net/api/v2/generate/check/{id}`

This checks whether the request is still in queue, processing, or complete.

### 4. Get final result

`GET https://aihorde.net/api/v2/generate/status/{id}`

This returns the final generated image URL once the image is ready.

## 6. Which Generation Model Is Used

The model is **not fixed to only one model all the time**.

The app checks the currently available public models from AI Horde and then chooses one dynamically.

### How model selection works

Inside `script.js`, there is logic that:

- fetches the live list of available image models
- filters out unsuitable models
- removes NSFW or unwanted model types
- checks queue speed and ETA
- prefers models that better match the selected style
- falls back to `stable_diffusion` if needed

### Current model behavior

The app tries to pick the best model based on:

- current queue speed
- availability
- selected style
- safe filtering logic

So the true answer is:

> PromptCanvas uses AI Horde public image models, selected dynamically at runtime, with `stable_diffusion` as a fallback.

## 7. How Prompt Generation Works

The generation flow looks like this:

1. The user enters a prompt.
2. The user selects style, ratio, and seed.
3. The app slightly improves the prompt using a style hint.
4. The app chooses a model from AI Horde.
5. The app sends the request.
6. The app keeps checking queue status.
7. When the image is ready, the image URL is shown in the preview area.
8. The result is saved into recent history.

## 8. How Styles Work

The styles in this project are prompt-based, not separate custom-trained models.

That means the app adds extra descriptive words to the user’s prompt.

For example:

- `anime` adds anime-like visual hints
- `watercolor` adds watercolor-like visual hints
- `natural` adds nothing extra

So style selection works by **prompt engineering**, not by switching the whole app to a completely different engine.

## 9. How Aspect Ratio Works

The aspect ratio dropdown changes the image size sent to the API.

Current size mapping in `script.js`:

- `square` -> `512 x 512`
- `portrait` -> `448 x 640`
- `landscape` -> `640 x 448`

These sizes were kept fairly small so that:

- generation is faster
- free queue load is lower
- the app has a better chance of completing requests

## 10. How Seed Works

A seed is used to make image generation more repeatable.

If the same prompt, style, ratio, and model are used with the same seed, the result may be similar or reproducible.

If the user leaves the seed blank:

- the app generates a random seed automatically

This helps create a new variation each time.

## 11. How the Web Page Was Built

The page was built as a single static interface using semantic HTML sections.

### Main layout sections

The page includes:

- top bar
- intro section
- prompt generator section
- result preview section
- tips section
- recent creations section
- footer credits section

### Layout approach

The page layout uses:

- CSS Grid for large section arrangement
- Flexbox for smaller UI alignment
- CSS variables for theme colors
- media queries for mobile responsiveness

## 12. How Day and Night Mode Works

The day/night toggle is built using:

- a button in the header
- CSS custom properties
- `data-theme="dark"` on the `<body>`
- `localStorage` to remember the user’s choice

### Flow

1. User clicks theme toggle.
2. JavaScript changes the theme on the `<body>`.
3. CSS variables change colors automatically.
4. The chosen theme is stored in `localStorage`.
5. On page reload, the saved theme is restored.

## 13. How Recent Creations Works

The app stores recent generation history in the browser using `localStorage`.

Each saved history item includes:

- prompt
- style
- style label
- ratio
- seed
- image URL
- unique ID

### What the Recent Creations section allows

For each previous item, the user can:

- reuse prompt
- download image
- delete the item

This is handled through the three-dot action menu in each card.

## 14. How Download Works

When the user downloads an image:

1. The app fetches the image URL
2. Converts it into a downloadable blob
3. Creates a temporary link
4. Clicks it automatically using JavaScript

If direct download fails, the app opens the image in a new tab so it can still be saved manually.

## 15. Why the App Sometimes Waits a Long Time

This happens because AI Horde is a free public queue.

That means:

- many users may be requesting images at the same time
- worker availability changes
- some models are busier than others

To improve this, the app:

- checks model status first
- tries to choose a faster model
- uses smaller image sizes
- limits generation steps

Even with that, queue delays can still happen because the service is free and shared.

## 16. Current Limitations of the Project

This app is better at:

- landscapes
- scenery
- fantasy environments
- artistic scenes

It is weaker at:

- posters
- diagrams
- logos
- UI-like design
- readable lettering

This is why the page itself now tells the user what kind of images to expect.

## 17. Why This Project Is Good for Learning

This project teaches several practical frontend concepts:

- DOM selection and manipulation
- form handling
- event listeners
- `fetch()` requests
- polling async APIs
- `localStorage`
- theme switching
- responsive CSS
- state management without frameworks
- prompt engineering

## 18. How You Can Explain This Project to Someone

You can explain it like this:

> PromptCanvas is a frontend text-to-image web application built with HTML, CSS, and JavaScript. It uses the free AI Horde public API to generate images from user prompts. The app supports theme switching, prompt presets, image history, downloads, and dynamic model selection based on queue availability.

## 19. Author

**Abuzaid Khan**  
Bachelors of Engineering in Artificial and Machine Learning

- GitHub: [Abuzaidk1234](https://github.com/Abuzaidk1234)
- LinkedIn: [Abuzaid Khan](https://www.linkedin.com/in/abuzaid-khan-b08998279?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app)
