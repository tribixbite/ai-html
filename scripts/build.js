import * as esbuild from 'esbuild';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

const ROOT_DIR = process.cwd();
const DIST_DIR = join(ROOT_DIR, 'dist');

// HTML template for compiled TSX apps
const htmlTemplate = (title, bundledCode) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module">
${bundledCode}
    </script>
</body>
</html>`;

async function buildTsxFiles() {
    console.log('🔨 Building TSX files...\n');

    // Create dist directory
    await mkdir(DIST_DIR, { recursive: true });

    // Find all TSX files in root (excluding node_modules)
    const files = await readdir(ROOT_DIR);
    const tsxFiles = files.filter(f => f.endsWith('.tsx') && !f.startsWith('_'));

    if (tsxFiles.length === 0) {
        console.log('No TSX files found to build.\n');
        return [];
    }

    const builtFiles = [];

    for (const tsxFile of tsxFiles) {
        const inputPath = join(ROOT_DIR, tsxFile);
        const outputName = basename(tsxFile, '.tsx') + '.html';
        const outputPath = join(DIST_DIR, outputName);

        try {
            // Bundle the TSX file
            const result = await esbuild.build({
                entryPoints: [inputPath],
                bundle: true,
                write: false,
                format: 'esm',
                target: 'es2020',
                jsx: 'automatic',
                jsxImportSource: 'react',
                define: {
                    'process.env.NODE_ENV': '"production"'
                },
                minify: true,
            });

            const bundledCode = result.outputFiles[0].text;
            const title = basename(tsxFile, '.tsx')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());

            const html = htmlTemplate(title, bundledCode);
            await writeFile(outputPath, html);

            console.log(`✅ ${tsxFile} → dist/${outputName}`);
            builtFiles.push(outputName);
        } catch (error) {
            console.error(`❌ Failed to build ${tsxFile}:`, error.message);
        }
    }

    console.log(`\n📦 Built ${builtFiles.length} TSX file(s)\n`);
    return builtFiles;
}

// Run build
buildTsxFiles()
    .then(files => {
        if (files.length === 0) {
            // No TSX files is okay, not an error
            process.exit(0);
        }
    })
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
