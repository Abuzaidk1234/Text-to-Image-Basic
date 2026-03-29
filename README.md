# PromptCanvas

PromptCanvas is a simple text-to-image generator mini project built with plain HTML, CSS, and JavaScript.

It is designed to be:

- easy to explain in a classroom
- easy to host for free
- free to try without a paid API key
- small enough to understand quickly

## What it does

- takes a text prompt from the user
- adds an optional art style
- lets the user choose an aspect ratio
- uses a seed so the image can be reproduced
- shows the generated image
- saves recent prompts in browser history
- lets the user download the result

## Tech stack

- `index.html`
- `styles.css`
- `script.js`

There is no backend and no build step.

## How it works

The frontend talks directly to AI Horde, a free community-powered image generation API.

This makes the project very light, but it also means:

- image generation depends on the external free service being available
- response speed can vary
- free queue times can vary depending on worker availability

If the service changes later, update the API logic in `script.js`.

## Run locally

You can:

1. Open `index.html` directly in a browser.
2. Use VS Code Live Server.
3. Host it on GitHub Pages, Netlify, or Vercel.

## Host for free

Recommended free hosts:

- GitHub Pages
- Netlify
- Vercel

## Good explanation for your teacher

You can describe it like this:

> "This is a frontend text-to-image app. The user enters a prompt, selects style and image ratio, and the app builds an AI image request. I also added seed-based reproducibility, download support, and prompt history to make the interface more practical."

## Files

- `index.html`: structure of the app
- `styles.css`: styling, layout, colors, animations, responsive design
- `script.js`: prompt handling, AI Horde API calls, queue polling, image loading, download, local history
