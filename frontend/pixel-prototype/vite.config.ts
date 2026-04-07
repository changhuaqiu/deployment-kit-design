import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

const projectRoot = fileURLToPath(new URL('./', import.meta.url))
const realProjectRoot = realpathSync(projectRoot)

// https://vite.dev/config/
export default defineConfig({
  root: realProjectRoot,
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    sourcemap: 'hidden',
  },
  server: {
    fs: {
      allow: [projectRoot, realProjectRoot],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    globals: true,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
})
