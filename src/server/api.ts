/**
 * API routes for mod notes
 * Handles CRUD operations for post mod notes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { CreateNoteRequest, UpdateNoteRequest, GetNotesResponse, NoteResponse } from '../shared/types';
import {
  buildNotesKey,
  parseNotes,
  serializeNotes,
  validateNoteContent,
  createNote,
  updateNote,
  canModifyNote,
} from './storage';
import { getFromStore, setInStore, deleteFromStore } from './shared-store';

export const api = new Hono();

/**
 * Helper to check if user is a moderator
 * In a real implementation, this would call Reddit API
 */
async function isModerator(context: Context): Promise<{ isMod: boolean; username: string }> {
  // In production, use Devvit context to verify moderator status
  const username = context.req.header('X-User-Name') || 'unknown_mod';
  const modHeader = context.req.header('X-Is-Mod') === 'true';
  return { isMod: modHeader, username };
}

/**
 * GET /api/notes/:postId
 * Get all notes for a specific post
 */
api.get('/notes/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    const subredditId = c.req.query('subredditId');
    
    if (!subredditId) {
      return c.json({ success: false, notes: [], error: 'Missing subredditId' } as GetNotesResponse, 400);
    }
    
    const { isMod } = await isModerator(c);
    if (!isMod) {
      return c.json({ success: false, notes: [], error: 'Unauthorized: moderator access required' } as GetNotesResponse, 403);
    }
    
    const key = buildNotesKey(subredditId, postId);
    const data = await getFromStore(key);
    const notes = parseNotes(data);
    
    // Sort by most recent first
    notes.sort((a, b) => b.createdAt - a.createdAt);
    
    return c.json({ success: true, notes } as GetNotesResponse, 200);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json(
      { success: false, notes: [], error: 'Failed to fetch notes' } as GetNotesResponse,
      500
    );
  }
});

/**
 * POST /api/notes
 * Create a new note for a post
 */
api.post('/notes', async (c) => {
  try {
    const { isMod, username } = await isModerator(c);
    if (!isMod) {
      return c.json(
        { success: false, error: 'Unauthorized: moderator access required' } as NoteResponse,
        403
      );
    }
    
    const body = await c.req.json<CreateNoteRequest>();
    const { postId, subredditId, content, label } = body;
    
    // Validate input
    if (!postId || !subredditId) {
      return c.json(
        { success: false, error: 'Missing required fields: postId, subredditId' } as NoteResponse,
        400
      );
    }
    
    const validation = validateNoteContent(content);
    if (!validation.valid) {
      return c.json({ success: false, error: validation.error } as NoteResponse, 400);
    }
    
    // Get existing notes
    const key = buildNotesKey(subredditId, postId);
    const data = await getFromStore(key);
    const notes = parseNotes(data);
    
    // Create new note
    const newNote = createNote(postId, subredditId, username, content, label);
    notes.push(newNote);
    
    // Save updated notes
    await setInStore(key, serializeNotes(notes));
    
    return c.json({ success: true, data: newNote } as NoteResponse, 201);
  } catch (error) {
    console.error('Error creating note:', error);
    return c.json({ success: false, error: 'Failed to create note' } as NoteResponse, 500);
  }
});

/**
 * PUT /api/notes/:noteId
 * Update an existing note
 */
api.put('/notes/:noteId', async (c) => {
  try {
    const noteId = c.req.param('noteId');
    const { isMod, username } = await isModerator(c);
    
    if (!isMod) {
      return c.json(
        { success: false, error: 'Unauthorized: moderator access required' } as NoteResponse,
        403
      );
    }
    
    const body = await c.req.json<UpdateNoteRequest & { postId: string; subredditId: string }>();
    const { postId, subredditId, content, label } = body;
    
    // Validate input
    if (!postId || !subredditId) {
      return c.json(
        { success: false, error: 'Missing required fields: postId, subredditId' } as NoteResponse,
        400
      );
    }
    
    const validation = validateNoteContent(content);
    if (!validation.valid) {
      return c.json({ success: false, error: validation.error } as NoteResponse, 400);
    }
    
    // Get existing notes
    const key = buildNotesKey(subredditId, postId);
    const data = await getFromStore(key);
    const notes = parseNotes(data);
    
    // Find and update the note
    const noteIndex = notes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      return c.json({ success: false, error: 'Note not found' } as NoteResponse, 404);
    }
    
    const note = notes[noteIndex];
    if (!note) {
      return c.json({ success: false, error: 'Note not found' } as NoteResponse, 404);
    }
    
    // Check permissions
    if (!canModifyNote(note, username, isMod)) {
      return c.json(
        { success: false, error: 'Unauthorized: you can only edit your own notes' } as NoteResponse,
        403
      );
    }
    
    // Update the note
    const updatedNote = updateNote(note, content, label, username);
    notes[noteIndex] = updatedNote;
    
    // Save updated notes
    await setInStore(key, serializeNotes(notes));
    
    return c.json({ success: true, data: updatedNote } as NoteResponse, 200);
  } catch (error) {
    console.error('Error updating note:', error);
    return c.json({ success: false, error: 'Failed to update note' } as NoteResponse, 500);
  }
});

/**
 * DELETE /api/notes/:noteId
 * Delete a note
 */
api.delete('/notes/:noteId', async (c) => {
  try {
    const noteId = c.req.param('noteId');
    const { isMod, username } = await isModerator(c);
    
    if (!isMod) {
      return c.json(
        { success: false, error: 'Unauthorized: moderator access required' } as NoteResponse,
        403
      );
    }
    
    const postId = c.req.query('postId');
    const subredditId = c.req.query('subredditId');
    
    if (!postId || !subredditId) {
      return c.json(
        { success: false, error: 'Missing required query parameters: postId, subredditId' } as NoteResponse,
        400
      );
    }
    
    // Get existing notes
    const key = buildNotesKey(subredditId, postId);
    const data = await getFromStore(key);
    const notes = parseNotes(data);
    
    // Find the note
    const noteIndex = notes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      return c.json({ success: false, error: 'Note not found' } as NoteResponse, 404);
    }
    
    const note = notes[noteIndex];
    if (!note) {
      return c.json({ success: false, error: 'Note not found' } as NoteResponse, 404);
    }
    
    // Check permissions
    if (!canModifyNote(note, username, isMod)) {
      return c.json(
        { success: false, error: 'Unauthorized: you can only delete your own notes' } as NoteResponse,
        403
      );
    }
    
    // Remove the note
    notes.splice(noteIndex, 1);
    
    // Save updated notes
    if (notes.length > 0) {
      await setInStore(key, serializeNotes(notes));
    } else {
      await deleteFromStore(key);
    }
    
    return c.json({ success: true } as NoteResponse, 200);
  } catch (error) {
    console.error('Error deleting note:', error);
    return c.json({ success: false, error: 'Failed to delete note' } as NoteResponse, 500);
  }
});
