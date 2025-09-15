const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${outputPath}`);
    }

    console.log('🎉 All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    // Fallback: create simple placeholder PNGs
    console.log('Creating placeholder icons...');
    createPlaceholderIcons();
  }
}

function createPlaceholderIcons() {
  const { createCanvas } = require('canvas');

  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Blue background
    ctx.fillStyle = '#0D488F';
    ctx.fillRect(0, 0, size, size);

    // White DNA symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧬', size / 2, size / 2 - size * 0.1);

    // JAG text
    ctx.font = `bold ${size * 0.15}px Arial`;
    ctx.fillText('JAG', size / 2, size * 0.75);

    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Created placeholder ${outputPath}`);
  });
}

// Check if sharp is available
try {
  require.resolve('sharp');
  generateIcons();
} catch (e) {
  console.log('Sharp not available, checking for canvas...');
  try {
    require.resolve('canvas');
    createPlaceholderIcons();
  } catch (e2) {
    console.log('Neither sharp nor canvas available. Creating minimal placeholders...');
    // Create minimal 1x1 transparent PNGs as placeholders
    const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    sizes.forEach(size => {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      fs.writeFileSync(outputPath, minimalPng);
      console.log(`✅ Created minimal placeholder ${outputPath}`);
    });
  }
}