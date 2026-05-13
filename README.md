# MultiversX Assets CDN - Documentation UI & Proxy Stack

Welcome to the **MultiversX Assets CDN Documentation Portal**. This repository provides a sophisticated, production-ready stack for serving, proxying, and documenting blockchain asset metadata. It is specifically designed for the MultiversX ecosystem to ensure a premium experience for developers and end-users alike.

---

## 🌐 The Role of an Assets CDN in Blockchain

In a decentralized ecosystem, asset metadata (such as token icons, verified names, social links, and project descriptions) is often scattered across multiple sources. The **MultiversX Assets CDN** acts as a centralized, high-performance "Source of Truth" that standardizes how this information is consumed by wallets, explorers, and decentralized applications (dApps).

### Why this is critical for Blockchain:

1.  **Trust & Verification:** By serving assets through a verified CDN, projects can ensure that users are seeing the official logos and metadata, reducing the risk of phishing or "look-alike" token scams. When a user sees a token logo in their wallet, they need to be certain it originates from a trusted source.
2.  **Performance:** Fetching large icons or complex JSON metadata directly from on-chain storage or IPFS can be slow and unpredictable. This CDN proxies and caches these assets to ensure millisecond response times, crucial for high-traffic dApps and real-time trading interfaces.
3.  **Consistency:** Standardizing the OpenAPI schema ensures that every developer in the MultiversX ecosystem can integrate token information using the same data structures, whether they are building a mobile wallet, a web-based DEX, or a governance dashboard.
4.  **CORS & Security:** Direct requests to raw asset storage (like GitHub or S3) often run into CORS (Cross-Origin Resource Sharing) limitations. This stack includes a built-in proxy that handles security headers, rate limiting, and cross-origin policies automatically.
5.  **Metadata Enrichment:** Beyond just serving files, this CDN can enrich metadata by aggregating data from multiple sources (e.g., combining on-chain token supply with off-chain project social links) into a single, cohesive JSON response.

---

## 🚀 Quick start

Get your development environment up and running in minutes:

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/multiversx/mx-tools-assers-cdn.git
    cd mx-tools-assers-cdn
    npm install
    ```
2.  **Environment Setup:**
    Copy the example environment file and add your credentials:
    ```bash
    cp .env.example .env
    # Edit .env and add your GITHUB_TOKEN
    ```
3.  **Infrastructure:**
    Start the Redis service required for rate limiting and state persistence:
    ```bash
    docker compose up -d
    ```
4.  **Launch:**
    ```bash
    npm run start-api
    ```
    -   **UI:** [http://localhost:3200](http://localhost:3200)
    -   **Proxy:** [http://localhost:3201](http://localhost:3201)

---

## 🏗️ Project Architecture Deep Dive

This repository is split into two primary components that work in tandem to provide a seamless development and production experience.

### 1. Documentation UI (The Frontend)
Built on a highly customized version of **Swagger UI**, the frontend provides:
-   **Premium Branding:** A custom MultiversX theme with Inter and Roboto typography.
-   **Native Dark Mode:** A fully integrated dark theme that respects system preferences and provides high contrast for code readability.
-   **React 18 & Redux:** Leverages the latest React features for a responsive, state-driven interface.
-   **Webpack 5 Optimization:** Includes tree-shaking, code-splitting (vendors vs. app), and CSS minification via PostCSS and Sass.

### 2. Assets Proxy (The Backend)
A specialized Express-based service that acts as a bridge between the UI and the raw asset storage:
-   **Background Sync:** Periodically fetches and caches asset metadata from GitHub to avoid API rate limits and ensure high availability even if the upstream source is temporarily down.
-   **Redis Caching:** Uses Redis as a high-speed data store for cached responses and rate-limit counters, allowing for horizontal scaling across multiple instances.
-   **Path Sanitization:** Protects against path traversal and SSRF attacks by strictly validating all incoming asset requests and rewriting paths before forwarding.
-   **Rate Limiting:** Implements `express-rate-limit` with a Redis store to protect against DDoS and brute-force attempts.

---

## 📂 Directory Structure Breakdown

Understanding the folder organization is key to efficient development:

| Directory | Purpose |
| :--- | :--- |
| `config/` | Contains testing configurations (Jest) and environment-specific overrides. |
| `cypress/` | End-to-end testing suite, including integration tests for the full UI/Proxy stack. |
| `dev-helpers/` | Local development assets, including the assets proxy script and local JSON definitions. |
| `dist/` | The target directory for the production build. Never modify files here manually. |
| `src/core/` | The heart of the application, containing Redux actions, reducers, and core UI components. |
| `src/style/` | Modular Sass implementation, including variables, theme definitions, and layout styles. |
| `webpack/` | The complete build pipeline configuration, split into specialized modules. |

---

## 🔧 Detailed Configuration Reference

The application behavior is controlled via environment variables. Below is a comprehensive list of all supported configurations:

### General Settings
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Build environment (`development`, `production`, `test`) | `development` |
| `PORT` | Port for the Assets Proxy server | `3201` |
| `ALLOWED_ORIGIN` | CORS allowed origins (comma separated) | `http://localhost:3200` |
| `ALLOWED_HOSTS` | Hosts allowed to access the server | `localhost,127.0.0.1` |

### GitHub Integration
| Variable | Description |
| :--- | :--- |
| `GITHUB_TOKEN` | Personal Access Token for GitHub API access (Required for high rate limits) |
| `REPO_OWNER` | GitHub owner of the assets repository |
| `REPO_NAME` | Name of the assets repository |
| `BRANCH` | Branch to fetch assets from (e.g., `main`, `staging`) |

### Infrastructure
| Variable | Description | Default |
| :--- | :--- | :--- |
| `REDIS_URL` | Connection string for the Redis instance | `redis://127.0.0.1:6379` |
| `REDIS_PASSWORD` | Password for the Redis instance (if applicable) | `null` |

---

## 📊 API Schema Examples

The CDN serves standardized JSON metadata. Below are examples of the schemas you can expect:

### Token Metadata (`/tokens/{identifier}.json`)
```json
{
  "identifier": "EGLD",
  "name": "eGold",
  "ticker": "EGLD",
  "decimals": 18,
  "assets": {
    "svg": "https://cdn.multiversx.com/tokens/egld.svg",
    "png": "https://cdn.multiversx.com/tokens/egld.png"
  },
  "social": {
    "website": "https://multiversx.com",
    "twitter": "https://twitter.com/multiversx"
  }
}
```

### Identity Metadata (`/identities/{address}.json`)
```json
{
  "address": "erd1...",
  "name": "Staking Provider X",
  "avatar": "https://cdn.multiversx.com/identities/staking-x.png",
  "description": "Premium staking services for the MultiversX network.",
  "verified": true
}
```

---

## 🛠️ Build System Internals

Our build system is designed for high performance and modularity. Here is a breakdown of the Webpack configurations:

-   **`webpack/core.js`**: Defines the base bundling logic for the Swagger UI core, including React and Redux integrations.
-   **`webpack/dev.js`**: Configures the `webpack-dev-server` with Hot Module Replacement (HMR) and the API proxy middleware.
-   **`webpack/stylesheets.js`**: Handles the compilation of Sass files into optimized CSS. It includes autoprefixing and minification for production.
-   **`webpack/standalone.js`**: Bundles the standalone layout version of the UI, which includes the top bar and sidebar navigation.

---

## 🧪 Testing & Quality Assurance

We maintain high code quality standards through a multi-layered testing strategy:

### `npm run lint`
Performs static analysis on the codebase using ESLint and Stylelint. It checks for:
-   JavaScript/JSX syntax errors and best practices.
-   Sass/SCSS styling consistency using modular variables.
-   Accessibility (a11y) violations in the UI components.

### `npm run lint-fix`
Automatically resolves formatting and minor logic issues found by the linters, ensuring a consistent code style across the project.

### `npm run test:unit`
Executes the Jest test suite. This includes:
-   **Component Testing:** Verifying that UI elements render correctly under different states.
-   **Logic Testing:** Ensuring that the proxy's sanitization and sync logic works as expected.
-   **Snapshot Testing:** Detecting unintended changes in the UI structure.

### `npm run cy:open` / `npm run cy:run`
Starts Cypress for End-to-End (E2E) testing. This validates the entire flow from the user perspective:
1.  UI loads correctly in the browser.
2.  Requests are successfully proxied to the backend.
3.  Asset metadata is correctly displayed and formatted.

---

## 💻 Recommended Development Environment

To ensure the best experience when contributing to this project, we recommend the following VS Code setup:

### Recommended Extensions
-   **ESLint:** `dbaeumer.vscode-eslint`
-   **Prettier:** `esbenp.prettier-vscode`
-   **Stylelint:** `stylelint.vscode-stylelint`
-   **Sass:** `syler.sass-indented`
-   **GitLens:** `eamodio.gitlens`

### Settings Snippet (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  }
}
```

---

## 🚢 Deployment Guide

### Static Hosting (The UI)
The output of `npm run build` is entirely static.
1.  **AWS S3:** Upload the contents of the `dist/` folder to an S3 bucket configured for static website hosting.
2.  **CloudFront:** Place a CloudFront distribution in front of the S3 bucket to enable HTTPS and global edge caching.
3.  **Vercel/Netlify:** Simply connect your repository and set the build command to `npm run build` and the output directory to `dist`.

### Infrastructure (The Proxy)
The Proxy should be deployed as a Node.js service (e.g., via PM2, Docker, or Kubernetes).
1.  Ensure the environment has access to a Redis instance.
2.  Set `ALLOWED_ORIGIN` to your production UI domain.
3.  Configure a reverse proxy (like Nginx) to handle SSL termination and load balancing.

---

## 🔍 Troubleshooting & FAQ

**Q: "Unauthorized" errors in the Proxy log?**
A: Ensure your `GITHUB_TOKEN` in the `.env` file is valid and has the `repo` scope. Without a token, GitHub strictly limits API requests, which will cause the background sync to fail.

**Q: Redis Connection Refused?**
A: This service depends on Redis for rate limiting. If you are running locally, ensure the Redis container is active: `docker ps`. If it's missing, run `docker compose up -d`.

**Q: Styles are not updating in the browser?**
A: Webpack's HMR usually handles this. If it fails, try a hard refresh (`Ctrl+F5`) or restart the dev server to clear the memory cache.

---

## 📚 Glossary of Terms

-   **CDN (Content Delivery Network):** A system of distributed servers that deliver web content to users based on their geographic location.
-   **HMR (Hot Module Replacement):** A Webpack feature that exchanges, adds, or removes modules while an application is running, without a full reload.
-   **CORS (Cross-Origin Resource Sharing):** A security mechanism that allows restricted resources on a web page to be requested from another domain.
-   **SSRF (Server-Side Request Forgery):** A security vulnerability where an attacker can cause the server-side application to make HTTP requests to an arbitrary domain.
-   **OAS (OpenAPI Specification):** A standard for describing RESTful APIs in a machine-readable format.

---

## 🗺️ Future Roadmap

-   [ ] **Multi-CDN Support:** Support for serving assets from IPFS and Arweave alongside GitHub.
-   [ ] **Custom Theme Editor:** A browser-based tool to customize the MultiversX theme tokens in real-time.
-   [ ] **GraphQL Support:** A GraphQL endpoint for more flexible asset metadata querying.
-   [ ] **Automated Asset Audits:** Built-in checks for image resolution, transparency, and aspect ratio compliance.

---

## 🤝 Contributing

We welcome contributions from the MultiversX community!
1.  **Fork** the repository on GitHub.
2.  **Clone** your fork to your local machine.
3.  **Create a branch** for your changes (`git checkout -b feature/amazing-feature`).
4.  **Write code** and ensure it's well-tested.
5.  **Submit a Pull Request** with a clear description of the changes.

---

## 📄 License

This project is licensed under the **Apache-2.0 License**. See the [LICENSE](LICENSE) file for more details.

---

*Built with passion by the MultiversX Developer Community. 🛠️✨*
