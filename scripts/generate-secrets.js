#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateSecret(size = 48) {
  return crypto.randomBytes(size).toString("hex");
}

const outputPath = process.argv[2] || "/tmp/indykpol-secrets.env";
const resolvedPath = path.resolve(outputPath);

const sessionSecret = generateSecret();
const apiKeyPepper = generateSecret();
const payload = `SESSION_SECRET=${sessionSecret}\nAPI_KEY_PEPPER=${apiKeyPepper}\n`;

fs.writeFileSync(resolvedPath, payload, { mode: 0o600 });

console.log("Sekrety zostały wygenerowane i zapisane do pliku:");
console.log(resolvedPath);
console.log("Skopiuj wartości do Netlify Environment Variables i usuń plik lokalny.");
