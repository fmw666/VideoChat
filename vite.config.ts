import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
    proxy: {
      // VOD AIGC API 代理（视频生成）
      '/api/vod': {
        target: 'https://vod.ap-guangzhou.tencentcloudapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vod/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
      // 豆包 API 代理（图片生成，兼容旧服务）
      '/api/doubao': {
        target: 'https://visual.volcengineapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doubao/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
      // Ark API 代理（豆包 seedream 3.0）
      '/api/ark': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/ark/, '/api/v3/images/generations'),
        // secure: false, // 如有自签证书可加
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'],
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          motion: ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  envPrefix: 'VITE_',
});
