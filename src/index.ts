import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './server/api';
import { formRoutes } from './server/forms';
import { menuRoutes } from './server/menu';

const app = new Hono();
const internal = new Hono();

// Set up internal routes for menu items and form submissions
internal.route('/menu', menuRoutes);
internal.route('/form', formRoutes);

// Set up API routes for mod note operations
app.route('/api', api);
app.route('/internal', internal);

// Serve the application
serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
