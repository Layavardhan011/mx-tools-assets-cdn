/**
 * Pure Utility Helpers for Backward Compatibility and Jest Unit Tests.
 * All HTTP Express proxy logic has been refactored into the NestJS Monorepo workspace.
 */

const networkMap = {
  devnet: "devnet",
  testnet: "testnet",
  mainnet: ""
};

const MAX_PARAM_LENGTH = 255;

function sanitize(param) {
  if (typeof param !== "string") return "";
  if (param.length > MAX_PARAM_LENGTH) return "";
  const clean = param.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (clean.includes("..") || clean.includes("/") || clean.includes("\\")) return "";
  if (clean.length > MAX_PARAM_LENGTH) return "";
  return clean;
}

function resolveParams(params) {
  const p1 = sanitize(params.p1);
  const p2 = sanitize(params.p2);
  const p3 = sanitize(params.p3);

  const networks = ["mainnet", "testnet", "devnet"];
  if (networks.includes(p1)) {
    return { network: p1, type: p2, id: p3 };
  }
  return { network: "mainnet", type: p1, id: p2 };
}

function getGithubPath(network, type, id = "") {
  const base = networkMap[network];
  let path = base ? `${base}/${type}` : type;
  if (id) {
    if (type === "accounts") {
      path = `${path}/${id}.json`;
    } else {
      path = `${path}/${id}/info.json`;
    }
  }
  return path;
}

function getRawUrl(network, type, id, fileName) {
  const base = networkMap[network];
  const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${process.env.REPO_OWNER || "Layavardhan011"}/${process.env.REPO_NAME || "demo-assets"}/${process.env.BRANCH || "main"}`;
  if (type === "accounts" && fileName.startsWith("icons/")) {
    return `${GITHUB_RAW_BASE}/${base ? base + "/" : ""}accounts/${fileName}`;
  }
  return `${GITHUB_RAW_BASE}/${base ? base + "/" : ""}${type}/${id}/${fileName}`;
}

module.exports = {
  networkMap,
  sanitize,
  resolveParams,
  getGithubPath,
  getRawUrl
};
