 MultiversX Assets CDN - Documentation UI

## Overview

Welcome to the **MultiversX Assets CDN Documentation Portal**. This repository contains a highly customized implementation of [Swagger UI](https://github.com/swagger-api/swagger-ui), specifically tailored to provide a premium, interactive API documentation experience for the MultiversX Assets ecosystem.

The MultiversX Assets CDN is a critical infrastructure component that serves metadata, icons, and social information for tokens, accounts, and identities across the MultiversX network (Mainnet, Testnet, and Devnet). This UI allows developers to explore, test, and integrate these assets seamlessly into their decentralized applications (dApps).

This project isn't just a simple wrapper; it's a specialized build that integrates seamlessly with the MultiversX design language, offering high performance, accessibility, and a developer-friendly environment for exploring complex blockchain asset schemas.

---

## Table of Contents

- [Core Features](#core-features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Production Build](#production-build)
- [Project Architecture](#project-architecture)
  - [Build System Deep Dive](#build-system-deep-dive)
  - [Bundle Structure](#bundle-structure)
- [Configuration & Customization](#configuration--customization)
  - [Styling with SASS](#styling-with-sass)
  - [Advanced Theme Customization](#advanced-theme-customization)
  - [The Initializer Script](#the-initializer-script)
  - [Updating API Definitions](#updating-api-definitions)
  - [Proxy Configuration](#proxy-configuration)
- [Available Scripts](#available-scripts)
- [Directory Structure](#directory-structure)
- [Deployment Guide](#deployment-guide)
  - [Static Hosting](#static-hosting)
  - [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Core Features

This customized version of Swagger UI includes several enhancements beyond the standard distribution:

-   **Premium MultiversX Branding:** Customized color palettes, typography (Inter/Roboto), and iconography aligned with the MultiversX design system.
-   **Native Dark Mode:** A fully integrated dark theme that respects user preferences and provides a high-contrast, eye-friendly interface for developers.
-   **Standalone Layout:** Optimized for a full-page experience with a clean navigation bar and focused content area.
-   **Integrated Asset Proxy:** Built-in development proxy to bypass CORS issues when testing against local or staging asset servers.
-   **Network Switching:** Easy exploration of assets across `mainnet`, `testnet`, and `devnet` through parameterized path exploration.
-   **Custom Initializer:** A specialized `dev-helper-initializer.js` that simplifies the bootstrapping of the UI with custom plugins and OAuth2 configurations.
-   **Responsive Design:** Fully mobile-responsive layout ensuring the documentation is accessible across all device types.
-   **Optimized Performance:** Minimized bundle sizes and efficient asset loading to ensure the UI remains snappy even with large API definitions.

---

## Prerequisites

Before you begin, ensure you have the following software installed on your machine:

-   **Node.js:** version 18.x or 20.x (LTS recommended).
-   **npm:** version 9.x or higher.
-   **nvm (Node Version Manager):** Recommended for managing Node.js versions.

To check your current versions, run:
```bash
node --version
npm --version
```

If you are using `nvm`, you can simply run `nvm use` in the root directory to switch to the project's preferred Node.js version (defined in `.nvmrc`).

---

## Getting Started

### Installation

Clone the repository and install the dependencies using `npm`:

```bash
git clone https://github.com/dharitri/mx-tools-assers-cdn.git
cd mx-tools-assers-cdn
npm install
```

### Development Server

To start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:3200`. 
By default, the dev server uses the `dev-helpers/index.html` template and loads the local `dev-helpers/swagger.json` definition.

### Production Build

To generate a production-ready static bundle:

```bash
npm run build
```

This command will:
1.  Clean the `dist/` directory.
2.  Compile SASS stylesheets into optimized CSS with autoprefixing and minification.
3.  Bundle JavaScript assets using Webpack, including tree-shaking for unused dependencies.
4.  Generate source maps for debugging in production environments.

The resulting files in `dist/` can be served by any static web server (Nginx, Apache, S3, etc.).

---

## Project Architecture

### Build System Deep Dive

This project leverages a sophisticated build pipeline designed for scalability and developer productivity:

-   **Webpack 5:** The backbone of our asset management. It handles everything from JS bundling to image optimization.
-   **Babel 7:** Ensures that our modern JavaScript code runs on all target browsers by transpiling ES6+, JSX, and other modern syntax.
-   **React 18:** The core UI framework. We've optimized the rendering path to ensure the Swagger UI feels interactive and smooth.
-   **Redux & Immutable.js:** These handle the complex state management required for the OpenAPI spec, including deep nesting of schemas and real-time validation.
-   **SASS (SCSS):** We use a modular SASS architecture, allowing us to maintain a complex design system with ease.

### Bundle Structure

The build system produces several distinct bundles to optimize loading times:

1.  **`swagger-ui-bundle.js`**: Contains the core logic and React components of Swagger UI.
2.  **`swagger-ui-standalone-preset.js`**: Includes the standalone layout and specific preset plugins.
3.  **`swagger-ui.css`**: The combined styles for both the core UI and our custom MultiversX theme.
4.  **`vendors.js`**: Contains third-party dependencies (React, Redux, etc.) to leverage browser caching effectively.

---

## Configuration & Customization

### Styling with SASS

The visual identity is defined in `src/style/`. You can customize the look and feel by modifying the SCSS files:

-   **`_variables.scss`**: This is the heart of the theme. Change `$primary-color`, `$secondary-color`, and font families here.
-   **`_dark-mode.scss`**: Specific overrides that activate when the `.dark-mode` class is applied or via media queries.
-   **`_topbar.scss`**: Controls the branding area at the top of the page.
-   **`_layout.scss`**: Adjusts margins, padding, and structural containers.

### Advanced Theme Customization

To add a new color token, follow this pattern in `_variables.scss`:

```scss
$mx-blue: #0033ff;
$mx-dark-blue: #001a80;

$primary-color: $mx-blue;
```

Then, use these variables in your component styles to ensure consistency throughout the application.

### The Initializer Script

The `dev-helpers/dev-helper-initializer.js` script is where the magic happens. It bootstraps the Swagger UI instance with specific configurations:

```javascript
const ui = SwaggerUIBundle({
  url: "./swagger.json",
  dom_id: "#swagger-ui",
  deepLinking: true,
  presets: [
    SwaggerUIBundle.presets.apis,
    SwaggerUIStandalonePreset
  ],
  plugins: [
    SwaggerUIBundle.plugins.DownloadUrl
  ],
  layout: "StandaloneLayout"
})
```

You can add custom plugins here to intercept requests, modify the UI, or add new functionality to the Swagger interface.

### Updating API Definitions

The API structure is defined using the OpenAPI 3.0.0 specification.
-   **Development:** Modify `dev-helpers/swagger.json` and the dev server will hot-reload the definition.
-   **Production:** You can point the UI to a remote URL by modifying the `url` parameter in your initialization script or by passing it via the query string: `?url=https://api.multiversx.com/assets/openapi.json`.

### Proxy Configuration

The Webpack dev server includes a powerful proxying capability to help you work around local development limitations:

```javascript
proxy: [
  {
    context: ["/assets-cdn"],
    target: "http://localhost:3201",
    changeOrigin: true,
    pathRewrite: { "^/assets-cdn": "" },
  },
],
```

This allows you to make requests to `/assets-cdn/*` on your local server, which will be transparently forwarded to your actual asset service.

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Launches the development server on `localhost:3200`. |
| `npm run build` | Compiles the production bundle in the `dist` folder. |
| `npm run clean` | Safely removes the `dist` folder and temporary build artifacts. |
| `npm run lint` | Analyzes code for potential errors and style violations. |
| `npm run lint-fix` | Attempts to automatically resolve linting issues. |
| `npm run test:unit` | Runs the full suite of unit tests using Jest. |
| `npm run cy:open` | Starts the Cypress test runner for E2E validation. |
| `npm run build-stylesheets` | Compiles only the SCSS files to CSS. |
| `npm run serve-static` | Starts a simple HTTP server for the `dist` directory on port 3002. |

---

## Directory Structure

```text
mx-tools-assers-cdn/
├── .github/            # GitHub Actions and issue templates
├── config/             # Testing and environment configurations
│   └── jest/           # Jest specific configuration files
├── dev-helpers/        # Local development environment assets
│   ├── index.html      # Dev server entry point
│   ├── swagger.json    # Local OpenAPI specification
│   └── dev-helper-initializer.js # UI bootstrapping logic
├── dist/               # Production-ready static assets
├── node_modules/       # External libraries and dependencies
├── src/                # Primary source code directory
│   ├── core/           # Core logic, actions, and reducers
│   ├── standalone/     # Standalone layout and UI presets
│   └── style/          # Modular SASS implementation
├── webpack/            # Webpack build scripts and configurations
│   ├── _config-builder.js # Shared build logic
│   ├── dev.js          # Development server config
│   └── prod.js         # Production optimization config
├── .eslintrc.js        # JavaScript linting rules
├── babel.config.js     # Transpilation rules for modern JS
├── package.json        # Project metadata, scripts, and dependencies
└── README.md           # You are here!
```

---

## Deployment Guide

### Static Hosting

The output of `npm run build` is a collection of static files. These can be hosted anywhere:

1.  **AWS S3 + CloudFront:** Create an S3 bucket, enable static website hosting, and point a CloudFront distribution to it for global low-latency delivery.
2.  **GitHub Pages:** Push the `dist` folder to a `gh-pages` branch or configure a GitHub Action to deploy automatically.
3.  **Vercel/Netlify:** Simply connect your repository and set the build command to `npm run build` and the output directory to `dist`.

### CI/CD Pipeline

We recommend a simple pipeline:
1.  **Lint & Test:** Ensure code quality on every PR.
2.  **Build:** Generate the `dist` folder in the CI environment.
3.  **Upload:** Sync the `dist` folder with your hosting provider.
4.  **Cache Invalidation:** If using a CDN like CloudFront, trigger a `/index.html` invalidation to ensure users see the latest version.

---

## Troubleshooting

### Common Setup Issues

**1. "Module not found" errors after update**
If you pull new changes and see errors, your `node_modules` might be out of sync.
```bash
rm -rf node_modules
npm install
```

**2. Port 3200 is already in use**
If you have another process running on the default port, you can change it in `webpack/dev.js`:
```javascript
devServer: {
  port: 3205, // Change this to an available port
}
```

**3. Styles aren't updating in the browser**
Check if there are any SASS compilation errors in your terminal. If the terminal is clean, try a hard refresh (`Cmd+Shift+R` or `Ctrl+F5`) to bypass browser cache.

---

## Contributing

The MultiversX community thrives on collaboration! Whether you're fixing a bug, improving the theme, or adding new features, we value your input.

1.  **Fork** the project on GitHub.
2.  **Clone** your fork to your local machine.
3.  **Create a branch** for your changes.
4.  **Write code** and ensure it's well-tested.
5.  **Submit a Pull Request** with a clear description of the changes.

---

## License

This project is licensed under the **Apache-2.0 License**. This means you are free to use, modify, and distribute the software, provided you include the original license and copyright notice. See the [LICENSE](LICENSE) file for the full text.

---

## Acknowledgments

-   **Swagger API Team:** For providing the foundation of this incredible tool.
-   **MultiversX Foundation:** For their vision and support of the developer ecosystem.
-   **Community Contributors:** Who help keep our tools sharp and accessible.

---
*Built with passion for the MultiversX ecosystem. 🛠️✨*
