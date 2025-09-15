const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to create a simple PNG of the correct size
function createPNG(width, height) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Create IHDR chunk with CRC
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Create a blue image data
  const pixelCount = width * height;
  const imageData = Buffer.alloc(height * (1 + width * 4)); // Each row has a filter byte + RGBA pixels

  let pos = 0;
  for (let y = 0; y < height; y++) {
    imageData[pos++] = 0; // filter type
    for (let x = 0; x < width; x++) {
      // RGBA: Blue color #0D488F
      imageData[pos++] = 0x0D; // R
      imageData[pos++] = 0x48; // G
      imageData[pos++] = 0x8F; // B
      imageData[pos++] = 0xFF; // A
    }
  }

  // Compress the image data
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(imageData);

  // Create IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = calculateCRC(Buffer.concat([typeBuffer, data]));

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC(data) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ 0xFFFFFFFF;
}

console.log('Creating proper-sized icon files...');

sizes.forEach(size => {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  const pngBuffer = createPNG(size, size);
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`✅ Created ${size}x${size} icon`);
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

console.log('🎉 All proper-sized icons created successfully!');