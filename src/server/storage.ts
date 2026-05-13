/**
 * Storage utilities for persisting mod notes
 * Uses Devvit Redis via context
 */

import { ModNote } from '../shared/types';

/**
 * Generate a unique ID for a note
 */
export function generateNoteId(): string {
  // Use a simple UUID-like string
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build the Redis key for a post's notes
 */
export function buildNotesKey(subredditId: string, postId: string): string {
  return `modnotes:${subredditId}:${postId}`;
}

/**
 * Parse stored notes from Redis
 */
export function parseNotes(data: string | null): ModNote[] {
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse notes:', e);
    return [];
  }
}

/**
 * Serialize notes for Redis storage
 */
export function serializeNotes(notes: ModNote[]): string {
  return JSON.stringify(notes);
}

/**
 * Validate note content
 */
export function validateNoteContent(content: string): { valid: boolean; error?: string } {
  const trimmed = content.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Note cannot be empty' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Note must be 500 characters or less' };
  }
  
  if (trimmed.length < 5) {
    return { valid: false, error: 'Note must be at least 5 characters' };
  }
  
  return { valid: true };
}

/**
 * Create a new mod note
 */
export function createNote(
  postId: string,
  subredditId: string,
  author: string,
  content: string,
  label?: string | undefined
): ModNote {
  const now = Date.now();
  
  return {
    id: generateNoteId(),
    postId,
    subredditId,
    author,
    content: content.trim(),
    label: label ?? undefined,
    createdAt: now,
    updatedAt: now,
    editHistory: [],
  };
}

/**
 * Update an existing note
 */
export function updateNote(
  note: ModNote,
  newContent: string,
  newLabel: string | undefined,
  editorUsername: string
): ModNote {
  const updated = { ...note };
  
  // Record edit history
  if (!updated.editHistory) {
    updated.editHistory = [];
  }
  
  updated.editHistory.push({
    editedBy: editorUsername,
    editedAt: updated.updatedAt,
    previousContent: updated.content,
  });
  
  updated.content = newContent.trim();
  if (newLabel !== undefined) {
    updated.label = newLabel;
  }
  updated.updatedAt = Date.now();
  
  return updated;
}

/**
 * Check if a moderator can edit/delete a note
 */
export function canModifyNote(
  note: ModNote,
  moderatorUsername: string,
  isModerator: boolean,
  isModeratorWithPermission?: boolean
): boolean {
  // Must be a moderator
  if (!isModerator) return false;
  
  // Author can always edit/delete their own notes
  if (note.author === moderatorUsername) return true;
  
  // Senior mods (with permission) can edit/delete any note
  if (isModeratorWithPermission) return true;
  
  return false;
}
