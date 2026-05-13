/**
 * Menu item endpoints for mod notes
 * Handles post context menu interactions
 */

import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import type { FormField } from '@devvit/shared-types/shared/form.js';
import { getServerPort } from '@devvit/web/server';
import { LABEL_OPTIONS } from '../shared/types';
import { buildNotesKey, parseNotes } from './storage';
import { getFromStore } from './shared-store';

export const menuRoutes = new Hono();

const buildModNoteFields = (postId: string, subredditId: string): FormField[] => {
  const fields: unknown[] = [
    {
      name: 'postId',
      label: 'Post ID',
      type: 'string',
      helpText: 'Auto-filled from the selected post.',
      required: true,
      defaultValue: postId,
    },
    {
      name: 'subredditId',
      label: 'Subreddit ID',
      type: 'string',
      helpText: 'Auto-filled from the subreddit.',
      required: true,
      defaultValue: subredditId,
    },
    {
      name: 'content',
      label: 'Mod Note',
      type: 'paragraph',
      helpText: 'Brief internal note (5-500 characters). Example: "Approved despite Rule 3 because this is breaking news."',
      placeholder: 'Explain why this post was approved, flagged, or allowed...',
      required: true,
    },
    {
      name: 'label',
      label: 'Category (Optional)',
      type: 'select',
      helpText: 'Quickly categorize the note for easy filtering.',
      options: LABEL_OPTIONS.map((label) => ({ label, value: label })),
      required: false,
    },
  ];
  return fields as FormField[];
};

const buildModNoteForm = (postId: string, subredditId: string) => ({
  fields: buildModNoteFields(postId, subredditId),
  title: 'Add Mod Note',
  description: 'Leave a private note for your mod team about this post.',
  acceptLabel: 'Save Note',
  cancelLabel: 'Cancel',
});

/**
 * POST /menu/add-mod-note
 * Show form to add a new mod note
 */
/**
 * POST /menu/view-mod-notes
 * Display all mod notes for a post (returns JSON that can be displayed)
 */
menuRoutes.post('/view-mod-notes', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const postId = request.targetId || request.post?.id || 'unknown';
  const subredditId = request.subreddit?.name || 'unknown';

  console.log(`Viewing mod notes for post ${postId} in subreddit ${subredditId}`);

  try {
    // Use Devvit context to access Redis (production) or file store (playtest)
    // Both are handled transparently by getFromStore
    const key = buildNotesKey(subredditId, postId);
    
    // Fetch data from storage (Redis in production, file in playtest)
    const data = await getFromStore(key);
    const notes = parseNotes(data);

    console.log('📌 Fetched notes:', notes.length, 'from key:', key);

    // Format notes as a readable response
    if (notes.length === 0) {
      return c.json<UiResponse>(
        {
          showToast: {
            text: 'No mod notes for this post yet. Use "Add Mod Note" to create one.',
            appearance: 'neutral',
          },
        },
        200
      );
    }

    // Format notes for display
    const notesText = notes
      .map((note) => {
        const createdDate = new Date(note.createdAt).toLocaleString();
        const label = note.label ? ` [${note.label}]` : '';
        const edited = note.updatedAt > note.createdAt ? ' (edited)' : '';
        return `📝 ${note.author}${label}${edited}\n${createdDate}\n${note.content}`;
      })
      .join('\n\n---\n\n');

    // Return notes formatted for display in the Devvit UI
    return c.json<UiResponse>(
      {
        showToast: {
          text: `📌 Found ${notes.length} mod note(s)\n\n${notesText}`,
          appearance: 'success',
        },
      },
      200
    );
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Error loading notes.',
          appearance: 'neutral',
        },
      },
      500
    );
  }
});

/**
 * POST /menu/add-mod-note
 * Show form to add a new mod note
 */
menuRoutes.post('/add-mod-note', async (c) => {
  try {
    const request = await c.req.json<MenuItemRequest>();
    
    // Extract post ID and subreddit ID from context
    const postId = request.targetId; // Post ID from menu context
    // Default to 'unknown' if subreddit info not available
    const subredditId = 'unknown';
    
    console.log(`Opening mod note form for post ${postId} in subreddit ${subredditId}`);
    
    return c.json<UiResponse>(
      {
        showForm: {
          name: 'addModNote',
          form: buildModNoteForm(postId, subredditId),
        },
      },
      200
    );
  } catch (error) {
    console.error('Error in add-mod-note:', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Error opening note form. Please try again.',
          appearance: 'neutral',
        },
      },
      500
    );
  }
});
