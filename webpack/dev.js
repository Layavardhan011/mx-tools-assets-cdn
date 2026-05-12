/**
 * @prettier
 */

const path = require("path")
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const {
  HtmlWebpackSkipAssetsPlugin,
} = require("html-webpack-skip-assets-plugin")

const configBuilder = require("./_config-builder")
const styleConfig = require("./stylesheets")

const projectBasePath = path.join(__dirname, "../")
const isDevelopment = process.env.NODE_ENV !== "production"

const devConfig = configBuilder(
  {
    minimize: false,
    mangle: false,
    sourcemaps: true,
    includeDependencies: true,
  },
  {
    mode: "development",
    entry: {
      "swagger-ui-bundle": ["./src/core/index.js"],
      "swagger-ui-standalone-preset": [
        "./src/standalone/presets/standalone/index.js",
      ],
      "swagger-ui": "./src/style/main.scss",
      vendors: ["react-refresh/runtime"],
    },

    performance: {
      hints: false,
    },

    output: {
      filename: "[name].js",
      chunkFilename: "[id].js",
      library: {
        name: "[name]",
        export: "default",
      },
      publicPath: "/",
    },

    devServer: {
      // ===============================================================================
      // ISSUE 3: ALLOWED HOSTS - Security fix to restrict which hosts can access the server
      // ===============================================================================
      // For development: defaults to localhost only
      // For production: Set ALLOWED_HOSTS env variable with comma-separated domains
      //
      // Examples:
      //   - Single domain: ALLOWED_HOSTS=tools.multiversx-assets-cdn.com
      //   - Multiple domains: ALLOWED_HOSTS=tools.multiversx.com,dapp.multiversx.com,localhost
      //   - Local dev: ALLOWED_HOSTS=localhost,127.0.0.1
      //
      // IMPORTANT: In production, avoid using "all" as it allows any IP to access your server
      // ===============================================================================
      allowedHosts: process.env.ALLOWED_HOSTS
        ? process.env.ALLOWED_HOSTS.split(",")
        : ["localhost", "127.0.0.1"], // Default: local development only

      // ===============================================================================
      // ISSUE 2: CORS CONFIGURATION - Security fix to restrict cross-origin requests
      // ===============================================================================
      // For development: defaults to allowing localhost
      // For production: Set ALLOWED_ORIGIN env variable with comma-separated origins
      //
      // Examples:
      //   - Single domain: ALLOWED_ORIGIN=https://tools.multiversx.com
      //   - Multiple domains: ALLOWED_ORIGIN=https://dapp.multiversx.com,https://tools.multiversx.com
      //   - Allow all (NOT recommended for production): ALLOWED_ORIGIN=*
      //
      // IMPORTANT: The * (wildcard) allows any website to make requests to your API
      // Only use * if your API is completely public and has no sensitive data
      // ===============================================================================
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "http://localhost:3000,http://localhost:3200",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      port: 3200,
      host: "0.0.0.0",
      hot: true,
      static: {
        directory: path.resolve(projectBasePath, "dev-helpers"),
        publicPath: "/",
      },
      client: {
        logging: "info",
        progress: true,
      },
      proxy: [
        {
          context: ["/assets-cdn"],
          target: "http://localhost:3201",
        },
      ],
    },

    module: {
      rules: [
        {
          test: /\.jsx?$/,
          include: [
            path.join(projectBasePath, "src"),
            path.join(projectBasePath, "node_modules", "object-assign-deep"),
          ],
          loader: "babel-loader",
          options: {
            retainLines: true,
            cacheDirectory: true,
            plugins: [
              isDevelopment && require.resolve("react-refresh/babel"),
            ].filter(Boolean),
          },
        },
        {
          test: /\.(txt|yaml)$/,
          type: "asset/source",
        },
        {
          test: /\.svg$/,
          use: ["@svgr/webpack"],
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/,
          type: "asset/inline",
        },
      ],
    },

    plugins: [
      isDevelopment && new ReactRefreshWebpackPlugin({ library: "[name]" }),
      new HtmlWebpackPlugin({
        template: path.join(projectBasePath, "dev-helpers", "index.html"),
      }),
      new HtmlWebpackSkipAssetsPlugin({
        skipAssets: [/swagger-ui\.js/],
      }),
    ].filter(Boolean),

    optimization: {
      runtimeChunk: "single", // for multiple entry points using ReactRefreshWebpackPlugin
    },
  }
)

// mix in the style config's plugins and loader rules

devConfig.plugins = [...devConfig.plugins, ...styleConfig.plugins]

devConfig.module.rules = [
  ...devConfig.module.rules,
  ...styleConfig.module.rules,
]

module.exports = devConfig
