import { readdir, readFile, writeFile, copyFile, mkdir, stat } from 'fs/promises';
import { join, basename } from 'path';

const ROOT_DIR = process.cwd();
const DIST_DIR = join(ROOT_DIR, 'dist');

// Extract title from HTML file
async function extractTitle(filePath) {
    try {
        const content = await readFile(filePath, 'utf-8');
        const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            return titleMatch[1].trim();
        }
    } catch (e) {
        // Ignore errors
    }
    return null;
}

// Get file size in human readable format
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Generate app card HTML
function generateAppCard(app) {
    const iconColors = [
        'from-purple-500 to-pink-500',
        'from-blue-500 to-cyan-500',
        'from-green-500 to-emerald-500',
        'from-orange-500 to-yellow-500',
        'from-red-500 to-rose-500',
        'from-indigo-500 to-purple-500',
        'from-teal-500 to-green-500',
        'from-pink-500 to-rose-500',
    ];

    const colorIndex = app.name.length % iconColors.length;
    const gradient = iconColors[colorIndex];
    const initial = app.name.charAt(0).toUpperCase();

    return `
        <a href="${app.file}" class="group block bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-800/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10">
            <div class="flex items-start gap-4">
                <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                    ${initial}
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                        ${app.title}
                    </h3>
                    <p class="text-sm text-gray-400 mt-1">
                        ${app.file}
                    </p>
                    <div class="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            ${app.size}
                        </span>
                        <span class="px-2 py-0.5 rounded-full ${app.type === 'tsx' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}">
                            ${app.type.toUpperCase()}
                        </span>
                    </div>
                </div>
                <svg class="w-5 h-5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        </a>`;
}

// Gallery HTML template
function galleryTemplate(apps) {
    const appCards = apps.map(generateAppCard).join('\n');
    const totalApps = apps.length;
    const htmlCount = apps.filter(a => a.type === 'html').length;
    const tsxCount = apps.filter(a => a.type === 'tsx').length;

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI HTML Apps Gallery</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
            min-height: 100vh;
        }
        .grid-bg {
            background-image:
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 50px 50px;
        }
        .glow {
            box-shadow: 0 0 60px rgba(168, 85, 247, 0.15);
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        .float-animation {
            animation: float 6s ease-in-out infinite;
        }
    </style>
</head>
<body class="text-white grid-bg">
    <!-- Header -->
    <header class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
        <div class="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
            <div class="text-center">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    ${totalApps} Apps Available
                </div>
                <h1 class="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-4">
                    AI HTML Apps
                </h1>
                <p class="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                    A collection of standalone single-page applications. Click any app to launch it.
                </p>
                <div class="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-green-500"></span>
                        ${htmlCount} HTML
                    </span>
                    <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        ${tsxCount} TSX
                    </span>
                </div>
            </div>
        </div>
    </header>

    <!-- Search & Filter -->
    <div class="max-w-6xl mx-auto px-4 mb-8">
        <div class="relative">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
                type="text"
                id="search"
                placeholder="Search apps..."
                class="w-full pl-12 pr-4 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            >
        </div>
    </div>

    <!-- Apps Grid -->
    <main class="max-w-6xl mx-auto px-4 pb-16">
        <div id="apps-grid" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            ${appCards}
        </div>

        <div id="no-results" class="hidden text-center py-16">
            <div class="text-6xl mb-4">🔍</div>
            <h3 class="text-xl font-semibold text-gray-300 mb-2">No apps found</h3>
            <p class="text-gray-500">Try a different search term</p>
        </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-800/50 py-8">
        <div class="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>Built with ❤️ using vanilla HTML, CSS & JavaScript</p>
            <p class="mt-2">
                <a href="https://github.com/tribixbite/ai-html" class="text-purple-400 hover:text-purple-300 transition-colors">
                    View on GitHub
                </a>
            </p>
        </div>
    </footer>

    <script>
        // Search functionality
        const searchInput = document.getElementById('search');
        const appsGrid = document.getElementById('apps-grid');
        const noResults = document.getElementById('no-results');
        const appCards = appsGrid.querySelectorAll('a');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            appCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const file = card.querySelector('p').textContent.toLowerCase();
                const matches = title.includes(query) || file.includes(query);

                card.style.display = matches ? 'block' : 'none';
                if (matches) visibleCount++;
            });

            noResults.classList.toggle('hidden', visibleCount > 0);
        });

        // Keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                searchInput.blur();
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    </script>
</body>
</html>`;
}

async function generateGallery() {
    console.log('🎨 Generating gallery...\n');

    // Ensure dist directory exists
    await mkdir(DIST_DIR, { recursive: true });

    const apps = [];

    // Get HTML files from root (excluding index.html and templates)
    const rootFiles = await readdir(ROOT_DIR);
    for (const file of rootFiles) {
        if (file.endsWith('.html') && file !== 'index.html' && !file.startsWith('_')) {
            const filePath = join(ROOT_DIR, file);
            const stats = await stat(filePath);
            const title = await extractTitle(filePath) || file.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            apps.push({
                name: file.replace('.html', ''),
                title,
                file,
                type: 'html',
                size: formatSize(stats.size),
            });

            // Copy HTML file to dist
            await copyFile(filePath, join(DIST_DIR, file));
            console.log(`📄 Copied ${file}`);
        }

        // Track TSX files (they'll be in dist as HTML after build)
        if (file.endsWith('.tsx') && !file.startsWith('_')) {
            const htmlFile = file.replace('.tsx', '.html');
            const distPath = join(DIST_DIR, htmlFile);

            try {
                const stats = await stat(distPath);
                const title = await extractTitle(distPath) || file.replace('.tsx', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                apps.push({
                    name: file.replace('.tsx', ''),
                    title,
                    file: htmlFile,
                    type: 'tsx',
                    size: formatSize(stats.size),
                });
            } catch (e) {
                // TSX file not built yet, skip
                console.log(`⚠️  ${file} not built yet, skipping`);
            }
        }
    }

    // Sort apps alphabetically
    apps.sort((a, b) => a.name.localeCompare(b.name));

    // Generate and write gallery
    const galleryHtml = galleryTemplate(apps);
    await writeFile(join(DIST_DIR, 'index.html'), galleryHtml);

    console.log(`\n✅ Gallery generated with ${apps.length} app(s)`);
    console.log(`📁 Output: dist/index.html\n`);
}

// Run
generateGallery().catch(console.error);
