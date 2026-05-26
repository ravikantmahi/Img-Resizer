const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Core engine that enforces strict government rules
async function processStrictGovernmentImage(buffer, type) {
    let width, height, minBytes, maxBytes, targetDPI;

    if (type === 'photo') {
        width = 132; height = 170; minBytes = 5120; maxBytes = 51200; // 5KB to 50KB
        targetDPI = 300; 
    } else {
        width = 170; height = 132; minBytes = 5120; maxBytes = 20480; // 5KB to 20KB
        targetDPI = 150; 
    }

    let quality = 100;
    let finalBuffer;
    
    // Loop to find the perfect compression under the MAX limit
    while (quality >= 10) {
        finalBuffer = await sharp(buffer)
            .resize(width, height, { fit: 'fill' }) // Forces EXACT dimensions
            .flatten({ background: '#ffffff' })     // Forces white background
            .withMetadata({ density: targetDPI })   // Injects the exact DPI 
            .jpeg({ quality: quality, force: true })// Forces JPG format
            .toBuffer();
            
        if (finalBuffer.length <= maxBytes) {
            break; // We are successfully under the maximum limit
        }
        quality -= 5; // File too big, lower quality and try again
    }

    // THE 5KB FIX: If the file is smaller than 5KB, we artificially pad the file
    // by adding invisible empty bytes to the end of the JPEG. This guarantees it passes.
    if (finalBuffer.length < minBytes) {
        const paddingNeeded = minBytes - finalBuffer.length + 200; // Pad to slightly above 5KB
        const padding = Buffer.alloc(paddingNeeded, 0); // Null bytes
        finalBuffer = Buffer.concat([finalBuffer, padding]);
    }

    return finalBuffer;
}

// API Endpoints
app.post('/api/upload/:type', upload.single('image'), async (req, res) => {
    try {
        const type = req.params.type;
        if (!['photo', 'signature', 'thumb'].includes(type)) return res.status(400).send('Invalid type');
        
        const buffer = await processStrictGovernmentImage(req.file.buffer, type);
        
        res.set('Content-Type', 'image/jpeg');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Image processing failed.');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));