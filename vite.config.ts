import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig(({ command }) => ({
  plugins: command === 'build' ? [devvit()] : [],
}));
