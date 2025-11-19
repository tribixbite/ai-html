import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = process.env.PORT || 3000;
const DIST_DIR = join(process.cwd(), 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

async function buildAll() {
    console.log('🔨 Building...\n');
    try {
        await execAsync('node scripts/build.js');
        await execAsync('node scripts/generate-gallery.js');
        console.log('✅ Build complete\n');
    } catch (error) {
        console.error('❌ Build failed:', error.message);
    }
}

const server = createServer(async (req, res) => {
    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

    try {
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
            filePath = join(filePath, 'index.html');
        }

        const content = await readFile(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
    }
});

// Build first, then start server
buildAll().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Development server running at http://localhost:${PORT}\n`);
        console.log('Press Ctrl+C to stop\n');
    });
});
