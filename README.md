# PromptCanvas

PromptCanvas is a lightweight text-to-image web application built with HTML, CSS, and JavaScript. It provides a clean browser-based interface for generating AI images from natural language prompts, with no paid API required.

This is an independent frontend project built by Abuzaid Khan. Image generation is powered by AI Horde's public API and volunteer worker network.

The project is designed to be simple to run, easy to host, and polished enough for portfolio, classroom, and demonstration use.

## Overview

PromptCanvas allows users to:

- enter a custom text prompt
- choose from available art styles
- select an aspect ratio
- use a seed for repeatable results
- generate and preview AI images
- download finished images
- save recent generations in browser history
- reuse, download, or delete previous prompts
- switch between day and night mode

## Best Use Cases

This generator works best for:

- landscapes
- fantasy scenes
- concept art
- atmospheric environments
- artistic visual exploration

It is not ideal for:

- diagrams
- posters
- logos
- UI mockups
- readable text inside images

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Vercel serverless function for secure API proxying
- AI Horde image generation API

There is no frontend build step, but the deployed version now uses a lightweight backend route to keep the AI Horde key private.

## Key Features

- Clean single-page interface
- Day and night theme toggle
- Prompt preset chips for quick testing
- Secure AI Horde backend integration
- Download support for generated images
- Instant-loading showcase gallery for demos and portfolio visitors
- Local recent-history section with action menu
- Responsive layout for desktop and mobile

## How It Works

The application sends image-generation requests to a small backend route in `/api/generate`. That route forwards the request to AI Horde using an API key stored in environment variables, polls through the frontend, and displays the returned image once the request is completed.

Because the image generation still depends on AI Horde's community worker network:

- generation speed may vary
- queue times may increase during busy periods
- results depend on external worker availability

## Recommended Demo Setup

For the best classroom or portfolio demo experience:

1. Deploy the project on Vercel.
2. Add your AI Horde API key as the `HORDE_API_KEY` environment variable.
3. Optionally add `HORDE_CLIENT_AGENT` with your app name.
4. If you run your own AI Horde worker, keep it online during demo times for better priority.
5. Replace the bundled showcase images in `demo-gallery/` with your own favorite generations before sharing the project publicly.

## Acknowledgement

PromptCanvas uses AI Horde for image generation.

AI Horde is a free, community-powered generation network supported by volunteer workers. This project uses their public API for the image generation backend, while PromptCanvas itself focuses on the frontend interface and user experience.

- Official website: https://aihorde.net/
- AI Horde repository: https://github.com/Haidra-Org/AI-Horde

## Project Structure

```text
.
|-- .env.example
|-- api/
|   `-- generate.js
|-- demo-gallery/
|   |-- flower-garden.svg
|   |-- misty-castle.svg
|   `-- moonlit-ship.svg
|-- index.html
|-- styles.css
|-- script.js
`-- README.md
```

- `index.html` contains the app structure and content
- `api/generate.js` proxies AI Horde requests and keeps your API key off the frontend
- `demo-gallery/` stores instant-loading showcase images for demos and visitors
- `styles.css` handles layout, theming, responsiveness, and UI styling
- `script.js` manages prompt handling, theme state, history, API requests, polling, and downloads

## Running Locally

You can run the project in any of the following ways:

1. Deploy it on Vercel with `HORDE_API_KEY` configured.
2. Use `vercel dev` locally if you want the backend route during development.
3. Open `index.html` directly only for UI preview. Live generation needs the `/api/generate` route.

## Deployment

Since PromptCanvas is a static frontend project, deployment is straightforward:

### Vercel

1. Import the GitHub repository.
2. Add `HORDE_API_KEY` to your environment variables.
3. Optionally add `HORDE_CLIENT_AGENT`.
4. Deploy.

No build command is required.

### Other hosts

The included `/api/generate` route is ready for Vercel. If you deploy elsewhere, you will need an equivalent backend function to keep the AI Horde key private.

## Limitations

- Image quality depends on the selected free model and queue availability.
- Some prompts may be delayed during peak traffic.
- Free models are better at artistic imagery than structured design content.
- Safety filters on public services may occasionally block harmless prompts.

## Author

**Abuzaid Khan**  
Bachelors of Engineering in Artificial and Machine Learning

- GitHub: [Abuzaidk1234](https://github.com/Abuzaidk1234)
- LinkedIn: [Abuzaid Khan](https://www.linkedin.com/in/abuzaid-khan-b08998279?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app)

## License

This project is shared for educational and personal showcase purposes.
