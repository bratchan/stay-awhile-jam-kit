import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rundotGameLibrariesPlugin } from '@series-inc/rundot-game-sdk/vite';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CDN assets in cdn/ folder are automatically served in dev mode

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const adminUploadDir = path.join(projectRoot, 'public', 'admin-uploads');
const adminStatePath = path.join(adminUploadDir, 'admin-state.json');

function adminUploadPlugin() {
  return {
    name: 'tea-shop-cat-admin-upload',
    configureServer(server) {
      server.middlewares.use('/__admin/save-image', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(body) as {
                dataUrl?: string;
                filename?: string;
                folder?: string;
              };
              const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
                parsed.dataUrl ?? '',
              );
              if (!match) throw new Error('Expected a base64 image data URL.');

              const extension = match[1]
                .replace('jpeg', 'jpg')
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase();
              const baseName = path
                .basename(parsed.filename ?? `upload.${extension}`)
                .replace(/\.[^.]+$/, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 48);
              const folder = (parsed.folder ?? 'misc')
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 48);
              const safeFolder = folder || 'misc';
              const safeName = `${Date.now()}-${baseName || 'upload'}.${extension || 'png'}`;
              const outputDir = path.join(adminUploadDir, safeFolder);
              const outputPath = path.join(outputDir, safeName);

              await mkdir(outputDir, { recursive: true });
              await writeFile(outputPath, Buffer.from(match[2], 'base64'));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ src: `/admin-uploads/${safeFolder}/${safeName}` }));
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : 'Upload failed.',
                }),
              );
            }
          })();
        });
      });
      server.middlewares.use('/__admin/delete-image', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(body) as { src?: string };
              const src = parsed.src ?? '';
              if (!src.startsWith('/admin-uploads/') || src.endsWith('/admin-state.json')) {
                throw new Error('Only uploaded images can be deleted.');
              }

              const publicRoot = path.join(projectRoot, 'public');
              const relativePath = decodeURIComponent(src.replace(/^\/+/, ''));
              const outputPath = path.resolve(publicRoot, relativePath);
              const uploadRoot = path.resolve(adminUploadDir);
              if (!outputPath.startsWith(`${uploadRoot}${path.sep}`)) {
                throw new Error('Invalid upload path.');
              }

              await unlink(outputPath);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ deleted: true }));
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : 'Delete failed.',
                }),
              );
            }
          })();
        });
      });
      server.middlewares.use('/__admin/save-state', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(body);
              await mkdir(adminUploadDir, { recursive: true });
              await writeFile(adminStatePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ src: '/admin-uploads/admin-state.json' }));
            } catch (error) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : 'State save failed.',
                }),
              );
            }
          })();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(), // Must come first - handles JSX transform
    adminUploadPlugin(),
    rundotGameLibrariesPlugin(),
  ],
  base: './',
  server: {
    allowedHosts: true,
  },
  // Vite uses esbuild both for transforms and (in dev) dependency prebundling.
  // RUN.game SDK includes top-level await, so we must target an environment that supports it.
  esbuild: {
    target: 'es2022',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
  build: {
    target: 'es2022', // Support top-level await for embedded libraries
  },
});
