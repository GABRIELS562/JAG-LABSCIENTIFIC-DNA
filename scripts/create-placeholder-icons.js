const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// This is a minimal 1x1 blue PNG that will serve as a placeholder
// It's a valid PNG that won't cause errors, just won't look pretty
const bluePlaceholderPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

console.log('Creating placeholder icon files...');

sizes.forEach(size => {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(outputPath, bluePlaceholderPng);
  console.log(`✅ Created placeholder: icon-${size}x${size}.png`);
});

// Also copy them to dist/icons for immediate use
const distIconsDir = path.join(__dirname, '../dist/icons');
if (fs.existsSync(path.join(__dirname, '../dist'))) {
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true });
  }

  sizes.forEach(size => {
    const sourcePath = path.join(outputDir, `icon-${size}x${size}.png`);
    const destPath = path.join(distIconsDir, `icon-${size}x${size}.png`);
    fs.copyFileSync(sourcePath, destPath);
  });
  console.log('✅ Copied icons to dist/icons directory');
}

console.log('🎉 All placeholder icons created successfully!');