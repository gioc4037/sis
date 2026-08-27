const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

let html = fs.readFileSync(indexPath, 'utf-8');

// Replace default favicon with inline SVG checkmark
const svgFavicon = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='96' fill='%23008F4C'/%3E%3Cpath d='M149 256l74 74 140-140' stroke='%23FFFFFF' stroke-width='48' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E" />`;
html = html.replace(/<link rel="icon"[^>]*\/?>/, svgFavicon);

// Inject manifest and PWA meta tags before </head>
const manifestLink = '<link rel="manifest" href="/manifest.json" />\n  <link rel="apple-touch-icon" href="/assets/icon.png" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n  <meta name="apple-mobile-web-app-title" content="TaskMgr" />\n  ';
html = html.replace('</head>', `  ${manifestLink}</head>`);

// Inject service worker registration before </body>
const swScript = '<script>\n    if ("serviceWorker" in navigator) {\n      window.addEventListener("load", () => {\n        navigator.serviceWorker.register("/service-worker.js").catch(() => {});\n      });\n    }\n  </script>\n  ';
html = html.replace('</body>', `  ${swScript}</body>`);

fs.writeFileSync(indexPath, html);

// Copy manifest and service worker to dist
fs.copyFileSync(path.join(__dirname, 'web', 'manifest.json'), path.join(distDir, 'manifest.json'));
fs.copyFileSync(path.join(__dirname, 'web', 'service-worker.js'), path.join(distDir, 'service-worker.js'));

// Copy assets/icon.png to dist/assets/
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}
const iconSrc = path.join(__dirname, 'assets', 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(distAssetsDir, 'icon.png'));
}

console.log('PWA assets injected into dist/');
