/**
 * Form submission handlers for mod notes
 */

import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import {
  buildNotesKey,
  parseNotes,
  serializeNotes,
  validateNoteContent,
  createNote,
} from './storage';
import { getFromStore, setInStore } from './shared-store';

export const formRoutes = new Hono();

interface FormSubmissionRequest {
  formData?: Record<string, unknown>;
  userId?: string;
  [key: string]: unknown; // Devvit might send fields at top level
}

/**
 * POST /forms/add-mod-note-submit
 * Handle form submission for adding/editing a mod note
 */
formRoutes.post('/add-mod-note-submit', async (c) => {
  try {
    const request = await c.req.json<FormSubmissionRequest>();
    
    console.log('=== FULL REQUEST ===', JSON.stringify(request, null, 2));
    
    // Try multiple approaches to extract form data
    // Approach 1: Check for formData property
    const formData = (request?.formData || {}) as Record<string, string | boolean | string[]>;
    
    // Approach 2: Check for top-level fields (Devvit might send them here)
    const topLevelContent = String(request.content || '').trim();
    const topLevelLabel = String(request.label || '').trim() || undefined;
    const topLevelPostId = String(request.postId || '').trim();
    const topLevelSubredditId = String(request.subredditId || '').trim();
    
    console.log('Approach 1 (formData):', formData);
    console.log('Approach 2 (top-level):', { topLevelPostId, topLevelSubredditId, topLevelContent, topLevelLabel });
    console.log('Request keys:', Object.keys(request || {}));
    
    // Use top-level if formData is empty
    const postId = topLevelPostId || String(formData.postId || '').trim() || 'post_' + Date.now();
    const subredditId = topLevelSubredditId || String(formData.subredditId || '').trim() || 'unknown';
    const content = topLevelContent || String(formData.content || '').trim();
    const label = topLevelLabel || String(formData.label || '').trim() || undefined;
    
    console.log('Final extracted:', { postId, subredditId, contentLength: content.length, label });
    
    // Validate content first
    if (!content) {
      console.log('Validation failed - missing content');
      return c.json<UiResponse>(
        {
          showToast: {
            text: 'Error: Please enter a note.',
            appearance: 'neutral',
          },
        },
        400
      );
    }
    
    const validation = validateNoteContent(content);
    if (!validation.valid) {
      console.log('Validation failed:', validation.error);
      return c.json<UiResponse>(
        {
          showToast: {
            text: `Error: ${validation.error}`,
            appearance: 'neutral',
          },
        },
        400
      );
    }
    
    // Get username from context
    const username = c.req.header('devvit-user-name') || request.userId || 'unknown_mod';
    
    try {
      // Get existing notes from storage (works with both Redis and file-based store)
      const key = buildNotesKey(subredditId, postId);
      console.log('SAVING: key =', key);
      
      const data = await getFromStore(key);
      const notes = parseNotes(data);
      
      // Create new note
      const newNote = createNote(postId, subredditId, username, content, label);
      notes.push(newNote);
      
      // Save to storage
      await setInStore(key, serializeNotes(notes));
      console.log('SAVED: Note created:', newNote.id);
      
      return c.json<UiResponse>(
        {
          showToast: {
            text: 'Mod note added successfully!',
            appearance: 'success',
          },
        },
        200
      );
    } catch (storageError) {
      console.error('Storage error:', storageError);
      return c.json<UiResponse>(
        {
          showToast: {
            text: 'Error saving note. Please try again.',
            appearance: 'neutral',
          },
        },
        500
      );
    }
  } catch (error) {
    console.error('Error processing form submission:', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Error processing form. Please try again.',
          appearance: 'neutral',
        },
      },
      500
    );
  }
});
