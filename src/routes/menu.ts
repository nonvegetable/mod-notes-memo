/**
 * This file is deprecated. See src/server/menu.ts instead.
 * This was part of the old "Mop" template and is no longer used.
 */

import { Hono } from 'hono';

export const menu = new Hono();

// Deprecated endpoints
menu.post('/mop-comment', async (c) => {
  return c.json({ error: 'This endpoint has been moved' }, 410);
});

menu.post('/mop-post', async (c) => {
  return c.json({ error: 'This endpoint has been moved' }, 410);
});

