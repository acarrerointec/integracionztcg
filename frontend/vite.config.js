import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy para la API de Grafana
      '/api/grafana': {
        target: 'http://monitoreo.rocstar.tv:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/grafana/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Grafana:', req.method, req.url);
            // Añadir la API Key en las peticiones
            proxyReq.setHeader('Authorization', 'Bearer eyJrIjoiSFY5bzdXTzlMZUsyT0d6d2VnSjVINzJsYVBCSUpyZDIiLCJuIjoiYWNhcnJlcm8iLCJpZCI6MX0=');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Grafana:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy para tu backend existente (si lo necesitas)
      '/api/backend': {
        target: 'http://192.168.10.38:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Backend Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Backend:', req.method, req.url);
          });
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'bootstrap', 'axios'],
    exclude: ['js-big-decimal']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: []
    }
  },
  define: {
    'process.env': {}
  }
})