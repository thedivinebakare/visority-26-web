import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('C:\\Users\\NexusPC\\.gemini\\antigravity-ide\\brain\\cbae1c90-0a90-4286-892b-9b7774db087f\\.system_generated\\steps\\27\\content.md', 'utf-8');

// Extract all image URLs
const imgRegex = /https:\/\/framerusercontent\.com\/images\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|svg|webp)/g;
const images = [...new Set(html.match(imgRegex) || [])];

// Extract all text content inside framer elements
const textRegex = />([^<]{2,})</g;
let match;
const texts = [];
while ((match = textRegex.exec(html)) !== null) {
  const t = match[1].trim();
  if (t && !t.startsWith('@') && !t.includes('{') && !t.includes('var(') && !t.includes('function') && !t.includes('framer')) {
    texts.push(t);
  }
}

// Extract CSS tokens
const tokenRegex = /--token-[a-f0-9-]+:\s*([^;]+);/g;
const tokens = {};
while ((match = tokenRegex.exec(html)) !== null) {
  tokens[match[0].split(':')[0].trim()] = match[1].trim();
}

const report = {
  totalImages: images.length,
  images,
  tokens,
  texts: [...new Set(texts)]
};

writeFileSync('C:\\Users\\NexusPC\\.gemini\\antigravity-ide\\brain\\cbae1c90-0a90-4286-892b-9b7774db087f\\scratch\\extracted_framer_data.json', JSON.stringify(report, null, 2));
console.log('Extracted successfully!');
