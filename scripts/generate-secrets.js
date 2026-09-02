#!/usr/bin/env node
const crypto = require("crypto");

function generateSecret(size = 48) {
  return crypto.randomBytes(size).toString("hex");
}

const sessionSecret = generateSecret();
const apiKeyPepper = generateSecret();

console.log("# Wygenerowane sekrety (wklej do Netlify Environment Variables):");
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`API_KEY_PEPPER=${apiKeyPepper}`);
