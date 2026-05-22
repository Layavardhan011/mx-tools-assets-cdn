/* eslint-disable no-console */
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const certsDir = path.join(__dirname, "../certs")
const keyPath = path.join(certsDir, "server.key")
const certPath = path.join(certsDir, "server.crt")

function generateCerts() {
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true })
    console.log(`Created directory: ${certsDir}`)
  }

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log("Developer SSL certificates already exist. Skipping generation.")
    return
  }

  console.log("Generating self-signed developer SSL certificates...")
  try {
    // Generate a new private key and self-signed certificate using openssl
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -sha256 -days 365 -nodes -subj "/CN=localhost"`,
      { stdio: "inherit" }
    )
    console.log("Developer SSL certificates successfully generated!")
  } catch (error) {
    console.error("Failed to generate SSL certificates using openssl:", error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  generateCerts()
}

module.exports = { generateCerts }
