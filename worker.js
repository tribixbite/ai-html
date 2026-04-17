/**
 * Cloudflare Worker — dynamic OG meta tags for tribixbite.com/md
 *
 * Behavior:
 *   - For social crawler user-agents, fetches the requested .md, extracts
 *     a title + description, and injects OG/Twitter meta tags into the HTML
 *     before serving.
 *   - For regular browsers, passes the original `md.html` through unchanged
 *     (the viewer does its own client-side render).
 *
 * Route (Cloudflare dashboard):
 *   tribixbite.com/md*  →  this worker
 *
 * Deploy:
 *   wrangler deploy worker.js
 */

const S3_ORIGIN  = 'https://s3.us-east-2.amazonaws.com/tribixbite/sx';
const VIEWER_URL = `${S3_ORIGIN}/md.html`;
const FALLBACK_TITLE       = 'Markdown Viewer';
const FALLBACK_DESCRIPTION = 'A lightweight dark-mode markdown reader.';
const FALLBACK_IMAGE       = ''; // set to an absolute URL to enable a default og:image
const SITE_NAME            = 'tribixbite.com';

const CRAWLER_UA_RE = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slackbot|discord(?:bot)?|twitterbot|linkedinbot|pinterest|embedly|quora link preview|showyoubot|outbrain|vkShare|W3C_Validator|preview|summarize|applebot|bingbot|googlebot|yandex|duckduckbot|baiduspider/i;

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const ua  = request.headers.get('user-agent') || '';
        const isCrawler = CRAWLER_UA_RE.test(ua);

        // Resolve which markdown doc the user requested (?md=... or /md/slug)
        let mdParam = url.searchParams.get('md');
        if (!mdParam) {
            const slugMatch = url.pathname.match(/\/md(?:\.html)?\/(.+)$/);
            if (slugMatch) mdParam = decodeURIComponent(slugMatch[1]);
        }

        // If it's a browser, just proxy the viewer HTML (the viewer fetches
        // the markdown client-side). We fetch fresh each time to avoid staleness.
        if (!isCrawler) {
            return fetchViewer(request);
        }

        // Crawler path — try to fetch the markdown, extract metadata, inject.
        let meta = {
            title: FALLBACK_TITLE,
            description: FALLBACK_DESCRIPTION,
            image: FALLBACK_IMAGE,
            url: request.url,
        };

        if (mdParam) {
            try {
                const mdUrl = resolveMdUrl(mdParam);
                const mdRes = await fetch(mdUrl, {
                    cf: { cacheTtl: 300, cacheEverything: true },
                    headers: { 'user-agent': 'tribixbite-md-worker/1.0' },
                });
                if (mdRes.ok) {
                    const mdText = await mdRes.text();
                    const extracted = extractMeta(mdText);
                    meta = { ...meta, ...extracted };
                }
            } catch { /* fall through with defaults */ }
        }

        // Fetch the viewer HTML, then inject meta tags.
        const viewerRes = await fetch(VIEWER_URL, {
            cf: { cacheTtl: 300, cacheEverything: true },
        });
        if (!viewerRes.ok) {
            return new Response('Failed to load viewer', { status: 502 });
        }
        const viewerHtml = await viewerRes.text();
        const injected = injectMeta(viewerHtml, meta);

        return new Response(injected, {
            status: 200,
            headers: {
                'content-type': 'text/html;charset=utf-8',
                'cache-control': 'public, max-age=300',
                'x-og-source': mdParam || 'default',
            },
        });
    },
};

/**
 * Proxy the raw viewer HTML to the browser with light caching.
 * We do NOT inject meta for browsers — the client-side viewer will set
 * document.title itself once it loads.
 */
async function fetchViewer(request) {
    const res = await fetch(VIEWER_URL, {
        cf: { cacheTtl: 60, cacheEverything: true },
        headers: {
            // Forward any caching-relevant headers from the user
            'if-none-match': request.headers.get('if-none-match') || '',
        },
    });
    // Always rewrite content-type (S3 sometimes serves text/plain)
    const headers = new Headers(res.headers);
    headers.set('content-type', 'text/html;charset=utf-8');
    headers.set('cache-control', 'public, max-age=60');
    return new Response(res.body, { status: res.status, headers });
}

/**
 * Resolve the markdown param the same way the client-side viewer does.
 *   - Absolute http(s):// URLs used as-is
 *   - Bare names (no dot) get `.md` appended
 *   - Everything resolves to the S3 bucket unless already absolute
 */
function resolveMdUrl(mdParam) {
    if (/^https?:\/\//i.test(mdParam)) return mdParam;
    const withExt = mdParam.includes('.') ? mdParam : `${mdParam}.md`;
    return `${S3_ORIGIN}/${withExt}`;
}

/**
 * Extract an OG title + description from a markdown document.
 *   - title: first H1 (#), falling back to first non-empty line
 *   - description: first paragraph of plain text (strip markdown), truncated
 *   - image: first markdown image URL, if any
 */
function extractMeta(md) {
    // Strip common YAML frontmatter block at the top
    let body = md.replace(/^\uFEFF/, '');
    if (body.startsWith('---')) {
        const end = body.indexOf('\n---', 3);
        if (end !== -1) body = body.slice(end + 4);
    }

    const lines = body.split(/\r?\n/);
    let title = '';
    let description = '';
    let image = '';

    // Title: first ATX H1 (# Foo) or setext-style underlined heading
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const h1Match = line.match(/^#\s+(.+?)\s*#*\s*$/);
        if (h1Match) { title = h1Match[1]; break; }
        // setext h1: next line is all ===
        if (lines[i + 1] && /^=+\s*$/.test(lines[i + 1])) { title = line; break; }
        // If the first non-empty thing isn't a heading, we still take it as fallback
        if (!title && !/^[#\-*>`!|]/.test(line)) title = stripInline(line);
        break;
    }

    // Description: first paragraph that isn't a heading/list/table/code fence
    let inCodeFence = false;
    const paraBuf = [];
    for (const raw of lines) {
        const line = raw.trim();
        if (/^```/.test(line) || /^~~~/.test(line)) { inCodeFence = !inCodeFence; continue; }
        if (inCodeFence) continue;
        if (!line) {
            if (paraBuf.length) break;
            continue;
        }
        if (/^#{1,6}\s/.test(line)) continue;                 // heading
        if (/^(?:[-*+]|\d+\.)\s/.test(line)) continue;        // list
        if (/^>/.test(line)) continue;                         // blockquote
        if (/^\|/.test(line)) continue;                        // table row
        if (/^(?:-{3,}|={3,}|\*{3,})\s*$/.test(line)) continue; // hr / setext line
        paraBuf.push(line);
    }
    if (paraBuf.length) {
        description = stripInline(paraBuf.join(' ')).replace(/\s+/g, ' ').trim();
        if (description.length > 200) description = description.slice(0, 197).trimEnd() + '…';
    }

    // First image: ![alt](url)
    const imgMatch = body.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
    if (imgMatch) image = imgMatch[1];

    return {
        ...(title && { title }),
        ...(description && { description }),
        ...(image && { image }),
    };
}

/**
 * Strip basic markdown inline formatting so extracted text reads cleanly
 * as an OG description.
 */
function stripInline(s) {
    return s
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')         // images → alt text
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')           // links → text
        .replace(/`([^`]+)`/g, '$1')                       // inline code
        .replace(/\*\*([^*]+)\*\*/g, '$1')                 // bold
        .replace(/__([^_]+)__/g, '$1')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')           // italic
        .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
        .replace(/~~([^~]+)~~/g, '$1')                     // strikethrough
        .replace(/<[^>]+>/g, '')                            // stray tags
        .trim();
}

/**
 * Inject OG / Twitter meta tags into the viewer HTML.
 * We replace the <title> tag and splice fresh meta tags right before </head>,
 * removing any prior og: and twitter: tags to avoid duplicates.
 */
function injectMeta(html, meta) {
    const title = htmlEscape(meta.title);
    const description = htmlEscape(meta.description);
    const canonical = htmlEscape(meta.url);

    // Strip any pre-existing og:/twitter: meta so we don't double up.
    html = html.replace(
        /<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi,
        ''
    );

    // Replace the <title>
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

    const imageTag = meta.image
        ? `<meta property="og:image" content="${htmlEscape(meta.image)}">\n    ` +
          `<meta name="twitter:image" content="${htmlEscape(meta.image)}">\n    `
        : '';

    const metaBlock = `
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="${SITE_NAME}">
    ${imageTag}<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
`;

    // Also scrub a leading <meta name="description"> if the viewer ships one.
    html = html.replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, '');

    if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${metaBlock}</head>`);
    } else {
        // Fallback: prepend if <head> missing (shouldn't happen)
        html = metaBlock + html;
    }

    return html;
}

function htmlEscape(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
