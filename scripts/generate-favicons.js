#!/usr/bin/env node

/**
 * Favicon Generator Script for DuBible
 *
 * This script generates PNG favicons from the SVG source using sharp.
 * Run: node scripts/generate-favicons.js
 *
 * Prerequisites: npm install sharp (dev dependency)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');

const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
];

async function generateFavicons() {
  console.log('🎨 Generating DuBible favicons...\n');

  try {
    const svgBuffer = readFileSync(svgPath);

    for (const { size, name } of sizes) {
      const outputPath = join(publicDir, name);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} (${size}×${size})`);
    }

    console.log('\n✨ All favicons generated successfully!');
    console.log('\nGenerated files:');
    sizes.forEach(({ name }) => console.log(`  - public/${name}`));

  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    console.log('\n💡 Make sure sharp is installed: npm install --save-dev sharp');
    process.exit(1);
  }
}

generateFavicons();
