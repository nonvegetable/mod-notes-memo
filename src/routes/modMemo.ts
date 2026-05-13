/**
 * This file is deprecated. See src/server/api.ts, src/server/forms.ts, and src/server/menu.ts
 */

import { Hono } from 'hono';

export const modMemo = new Hono();

// Routes moved to separate files in src/server/
modMemo.post('/post-memo', async (c) => {
  return c.json({ error: 'This endpoint has been moved to /api/notes' }, 410);
});

modMemo.get('/get-memo', async (c) => {
  return c.json({ error: 'This endpoint has been moved to /api/notes' }, 410);
});

