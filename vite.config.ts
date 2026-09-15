import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function serveDistPlugin(): Plugin {
  return {
    name: 'serve-dist-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const urlPath = req.url.split('?')[0];

        // Endpoint providing exact production manifest for Android APK generator
        if (urlPath === '/api/embedded-assets-info') {
          const distHtmlPath = path.join(process.cwd(), 'dist', 'index.html');
          const indexHtml = fs.existsSync(distHtmlPath) ? fs.readFileSync(distHtmlPath, 'utf8') : '';
          const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
          const assetFiles = fs.existsSync(distAssetsPath) ? fs.readdirSync(distAssetsPath) : [];
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.end(JSON.stringify({
            indexHtml,
            assets: assetFiles.map(f => `/assets/${f}`)
          }));
        }

        let filePath = '';
        if (urlPath.startsWith('/assets/')) {
          const inPublic = path.join(process.cwd(), 'public', urlPath);
          const inDist = path.join(process.cwd(), 'dist', urlPath);
          if (fs.existsSync(inPublic) && fs.statSync(inPublic).isFile()) {
            filePath = inPublic;
          } else if (fs.existsSync(inDist) && fs.statSync(inDist).isFile()) {
            filePath = inDist;
          }
        } else if (urlPath.startsWith('/dist/') || urlPath === '/embedded-index.html') {
          const inDist = urlPath === '/embedded-index.html'
            ? path.join(process.cwd(), 'dist', 'index.html')
            : path.join(process.cwd(), urlPath);
          if (fs.existsSync(inDist) && fs.statSync(inDist).isFile()) {
            filePath = inDist;
          }
        }

        if (filePath) {
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
          }
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return fs.createReadStream(filePath).pipe(res);
        }

        // Intercept any missing /assets/ request so Vite doesn't try to transform it as source code
        if (urlPath.startsWith('/assets/')) {
          if (urlPath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.statusCode = 404;
            return res.end('/* asset not found */');
          } else if (urlPath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.statusCode = 404;
            return res.end('/* asset not found */');
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), serveDistPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
