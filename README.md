# AI HTML Apps Gallery

A collection of standalone single-page applications (SPAs) hosted on GitHub Pages. Each app is self-contained in a single HTML file or TSX file that gets compiled to HTML.

## Live Gallery

Visit the live gallery at: **[https://tribixbite.github.io/ai-html](https://tribixbite.github.io/ai-html)**

Browse all available apps in a beautiful dark-mode interface that works great on mobile and desktop.

## Apps

The gallery automatically displays all apps in the repository:

- **HTML files** (`.html`) - Ready to use directly
- **TSX files** (`.tsx`) - Compiled to HTML during build

## Adding New Apps

### HTML Apps

Simply add a new `.html` file to the repository root. The gallery will automatically detect and display it on the next deployment.

### TSX Apps

1. Add your `.tsx` file to the repository root
2. The build process will compile it to a standalone HTML file
3. The compiled app will appear in the gallery

#### TSX App Structure

TSX apps should export a default component:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div>
      <h1>My App</h1>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

## Development

### Prerequisites

- Node.js 18+ or Bun

### Install Dependencies

```bash
npm install
# or
bun install
```

### Build TSX Files

```bash
npm run build
# or
bun run build
```

### Local Preview

```bash
npm run dev
# or
bun run dev
```

Then open `http://localhost:3000` to view the gallery.

## Deployment

The gallery is automatically deployed to GitHub Pages on every push to the main branch via GitHub Actions.

The deployment process:
1. Installs dependencies
2. Compiles all TSX files to HTML
3. Generates the gallery index
4. Deploys to GitHub Pages

## Tech Stack

- **Gallery**: Vanilla HTML/CSS/JS with Tailwind CSS
- **TSX Support**: esbuild for fast compilation
- **Deployment**: GitHub Actions + GitHub Pages

## License

MIT License - see [LICENSE](LICENSE) for details.
