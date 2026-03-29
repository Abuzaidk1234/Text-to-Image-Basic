# PromptCanvas

PromptCanvas is a simple text-to-image generator mini project built with plain HTML, CSS, JavaScript, and one tiny free serverless function.

It is designed to be:

- easy to explain in a classroom
- easy to host for free on Vercel
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
- `api/generate.js`

There is no traditional backend and no frontend build step.

## How it works

The frontend calls `/api/generate`, and that free serverless function fetches the image from public Pollinations endpoints and returns it to the page.

This makes the project very light, but it also means:

- image generation still depends on the external free service being available
- response speed can vary
- public endpoints may occasionally rate-limit or change behavior

If one route changes later, update the candidate URLs in `api/generate.js`.

## Run locally

For the working generator, deploy it on Vercel so the `/api/generate` route is available.

If you only open `index.html` directly, the UI loads but generation will not work because the serverless route is missing.

## Host for free

Recommended free host:

- Vercel

Why Vercel:

- it serves the frontend files for free
- it also runs the tiny `api/generate.js` function for free
- you do not need a paid API
- deployment is simple from a GitHub repo

## Good explanation for your teacher

You can describe it like this:

> "This is a frontend text-to-image app. The user enters a prompt, selects style and image ratio, and the app builds an AI image request. I also added seed-based reproducibility, download support, and prompt history to make the interface more practical."

## Files

- `index.html`: structure of the app
- `styles.css`: styling, layout, colors, animations, responsive design
- `script.js`: prompt handling, image loading, download, local history
- `api/generate.js`: free serverless proxy for image generation
