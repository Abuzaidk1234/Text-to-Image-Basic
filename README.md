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
- AI Horde public image generation API

There is no frontend build step and no traditional backend.

## Key Features

- Clean single-page interface
- Day and night theme toggle
- Prompt preset chips for quick testing
- Free public AI image generation workflow
- Download support for generated images
- Local recent-history section with action menu
- Responsive layout for desktop and mobile

## How It Works

The application sends image-generation requests to AI Horde's public API, polls the generation queue, and displays the returned image once the request is completed.

Because it uses a free public queue:

- generation speed may vary
- queue times may increase during busy periods
- results depend on external worker availability

## Acknowledgement

PromptCanvas uses AI Horde for image generation.

AI Horde is a free, community-powered generation network supported by volunteer workers. This project uses their public API for the image generation backend, while PromptCanvas itself focuses on the frontend interface and user experience.

- Official website: https://aihorde.net/
- AI Horde repository: https://github.com/Haidra-Org/AI-Horde

## Project Structure

```text
.
|-- index.html
|-- styles.css
|-- script.js
`-- README.md
```

- `index.html` contains the app structure and content
- `styles.css` handles layout, theming, responsiveness, and UI styling
- `script.js` manages prompt handling, theme state, history, API requests, polling, and downloads

## Running Locally

You can run the project in any of the following ways:

1. Open `index.html` directly in your browser.
2. Use VS Code Live Server.
3. Host it as a static site on GitHub Pages, Netlify, or Vercel.

## Deployment

Since PromptCanvas is a static frontend project, deployment is straightforward:

### GitHub Pages

1. Push the project to a GitHub repository.
2. Open repository settings.
3. Enable GitHub Pages for the main branch.

### Netlify or Vercel

1. Import the GitHub repository.
2. Deploy as a static site.

No build command is required.

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
