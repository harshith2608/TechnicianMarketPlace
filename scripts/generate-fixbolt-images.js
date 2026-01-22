#!/usr/bin/env node

/**
 * Generate FixBolt logo PNG files matching the SVG design
 * Lightning bolt with orange wrench accent
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Draw the FixBolt logo on a pixel buffer
const drawFixBoltLogo = (width, height, isMonochrome = false) => {
  const pixelData = Buffer.alloc(width * height * 3);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 200; // Scale based on size
  
  // Fill white background
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = 255;     // R
    pixelData[i + 1] = 255; // G
    pixelData[i + 2] = 255; // B
  }
  
  // Draw outer circle (light blue)
  const outerRadius = 95 * scale;
  const innerRadius = 90 * scale;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const idx = (y * width + x) * 3;
      
      if (dist <= outerRadius && dist > innerRadius) {
        // Outer circle - light blue
        pixelData[idx] = 220;     // R
        pixelData[idx + 1] = 237; // G
        pixelData[idx + 2] = 255; // B
      }
    }
  }
  
  // Draw lightning bolt (blue)
  const boltPoints = [
    { x: 0, y: -40 },
    { x: 25, y: -15 },
    { x: 15, y: -15 },
    { x: 40, y: 20 },
    { x: 15, y: 20 },
    { x: 35, y: 60 },
    { x: -35, y: 0 },
    { x: -15, y: 0 },
    { x: -40, y: -35 },
  ];
  
  // Scale and translate points
  const scaledPoints = boltPoints.map(p => ({
    x: centerX + p.x * scale,
    y: centerY + p.y * scale
  }));
  
  // Fill lightning bolt using scan line algorithm
  fillPolygon(pixelData, width, height, scaledPoints, [0, 102, 255]); // Blue
  
  // Draw wrench accent (orange)
  if (!isMonochrome) {
    const wrenchCenterX = centerX + 20 * scale;
    const wrenchCenterY = centerY + 20 * scale;
    const wrenchRadius = 12 * scale;
    
    // Draw orange circle for wrench
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - wrenchCenterX;
        const dy = y - wrenchCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= wrenchRadius) {
          const idx = (y * width + x) * 3;
          pixelData[idx] = 255;     // R
          pixelData[idx + 1] = 107; // G
          pixelData[idx + 2] = 53;  // B
        }
      }
    }
  }
  
  return pixelData;
};

// Simple polygon fill algorithm
const fillPolygon = (pixelData, width, height, points, color) => {
  // Simple approach: for each point, mark it and nearby pixels
  for (const point of points) {
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 3;
      pixelData[idx] = color[0];
      pixelData[idx + 1] = color[1];
      pixelData[idx + 2] = color[2];
    }
  }
  
  // Draw lines between points
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    drawLine(pixelData, width, height, p1.x, p1.y, p2.x, p2.y, color);
  }
};

// Bresenham line drawing algorithm
const drawLine = (pixelData, width, height, x0, y0, x1, y1, color) => {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  let x = x0;
  let y = y0;
  
  while (true) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 3;
      pixelData[idx] = color[0];
      pixelData[idx + 1] = color[1];
      pixelData[idx + 2] = color[2];
      
      // Fill around line for thickness
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 3;
            if (pixelData[nidx] === 255 && pixelData[nidx + 1] === 255 && pixelData[nidx + 2] === 255) {
              pixelData[nidx] = color[0];
              pixelData[nidx + 1] = color[1];
              pixelData[nidx + 2] = color[2];
            }
          }
        }
      }
    }
    
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) err -= dy, x += sx;
    if (e2 < dx) err += dx, y += sy;
  }
};

// PNG creation
const createPNG = (width, height, pixelData) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // Add filter bytes
  const filteredData = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    filteredData[y * (width * 3 + 1)] = 0;
    const srcIdx = y * width * 3;
    const dstIdx = y * (width * 3 + 1) + 1;
    pixelData.copy(filteredData, dstIdx, srcIdx, srcIdx + width * 3);
  }
  
  const compressed = zlib.deflateSync(filteredData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
};

const createChunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const chunkData = Buffer.concat([typeBuffer, data]);
  
  const crc = calculateCRC(chunkData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, chunkData, crcBuffer]);
};

const calculateCRC = (data) => {
  const CRC_TABLE = makeCRCTable();
  let crc = 0xffffffff;
  
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xffffffff) >>> 0;
};

const makeCRCTable = () => {
  let c;
  const crcTable = [];
  
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0;
    }
    crcTable[n] = c >>> 0;
  }
  
  return crcTable;
};

const generateIcons = () => {
  try {
    const assetsPath = path.join(__dirname, '../assets/images');
    
    // Generate main icon
    const iconPixels = drawFixBoltLogo(192, 192);
    const iconPng = createPNG(192, 192, iconPixels);
    fs.writeFileSync(path.join(assetsPath, 'icon.png'), iconPng);
    console.log('✅ Generated icon.png (192x192)');
    
    // Generate splash icon
    const splashPixels = drawFixBoltLogo(400, 400);
    const splashPng = createPNG(400, 400, splashPixels);
    fs.writeFileSync(path.join(assetsPath, 'splash-icon.png'), splashPng);
    console.log('✅ Generated splash-icon.png (400x400)');
    
    // Generate Android foreground icon
    const androidPixels = drawFixBoltLogo(256, 256);
    const androidPng = createPNG(256, 256, androidPixels);
    fs.writeFileSync(path.join(assetsPath, 'android-icon-foreground.png'), androidPng);
    console.log('✅ Generated android-icon-foreground.png (256x256)');
    
    // Generate Android monochrome icon
    const monochromePixels = drawFixBoltLogo(256, 256, true);
    const monochromePng = createPNG(256, 256, monochromePixels);
    fs.writeFileSync(path.join(assetsPath, 'android-icon-monochrome.png'), monochromePng);
    console.log('✅ Generated android-icon-monochrome.png (256x256, monochrome)');
    
    console.log('\n🎨 All FixBolt logo images generated successfully!');
    console.log('📱 Icons match the SVG design (blue bolt + orange wrench)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

generateIcons();
