/**
 * @prettier
 */

const { gitDescribeSync } = require("git-describe")

function getRepoInfo() {
  try {
    return gitDescribeSync(__dirname)
  } catch (e) {
    console.error(e)
    return {
      hash: "noGit",
      dirty: false,
    }
  }
}

function getDevtool(sourcemaps, minimize, mode = "production") {
  // Disable source maps in production for security
  if (mode === "production" || !sourcemaps) return false
  return minimize ? "source-map" : "cheap-module-source-map"
}

module.exports = {
  getRepoInfo,
  getDevtool,
}
