/* eslint-disable no-undef, no-console */


window.onload = function() {
  window["SwaggerUIBundle"] = window["swagger-ui-bundle"]
  window["SwaggerUIStandalonePreset"] = window["swagger-ui-standalone-preset"]

  // Get URL from config or query string, default to local
  let specUrl = new URLSearchParams(window.location.search).get("url") || "./swagger.json"

  // Validate URL - only allow local specs for security
  // Block external URLs to prevent loading malicious specs
  if (!specUrl.startsWith("./") && !specUrl.startsWith("/")) {
    console.warn("External spec URLs are blocked for security. Loading default local spec.")
    specUrl = "./swagger.json" // Fallback to local spec
  }

  // Build a system
  const ui = SwaggerUIBundle({
    url: specUrl,
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    // requestSnippetsEnabled: true,
    layout: "StandaloneLayout"
  })

  window.ui = ui

  // Only initialize OAuth if credentials are configured via URL params or window
  // process.env is not available in browser, use window.OAUTH_CONFIG or URL params
  const getOAuthConfig = () => {
    // Check URL params first: ?oauth_client_id=xxx&oauth_client_secret=xxx
    const urlParams = new URLSearchParams(window.location.search)
    return {
      clientId: urlParams.get("oauth_client_id") || window.OAUTH_CLIENT_ID || "",
      clientSecret: urlParams.get("oauth_client_secret") || window.OAUTH_CLIENT_SECRET || "",
      realm: urlParams.get("oauth_realm") || window.OAUTH_REALM || "",
      appName: urlParams.get("oauth_app_name") || window.OAUTH_APP_NAME || "",
      scopeSeparator: " ",
      scopes: "openid profile email phone address",
      additionalQueryStringParams: {},
      useBasicAuthenticationWithAccessCodeGrant: false,
      usePkceWithAuthorizationCodeGrant: false
    }
  }

  const oauthConfig = getOAuthConfig()

  // Only init OAuth if clientId is provided
  if (oauthConfig.clientId) {
    ui.initOAuth(oauthConfig)
  }
}

/**
 * Helper to initialize the Assets Proxy configuration
 * @param {string} proxyUrl - The URL of the assets proxy server
 * @returns {Promise}
 */
window.initAssetsProxy = function(proxyUrl) {
  console.log(`Initializing Assets Proxy with: ${proxyUrl}`)
  return Promise.resolve({
    proxyUrl: proxyUrl,
    status: "initialized"
  })
}
