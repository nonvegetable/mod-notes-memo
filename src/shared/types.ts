/**
 * Shared types and interfaces for Mod Notes Memo
 * Used by both client and server
 */

export enum NoteLabel {
  RULE_EXCEPTION = 'Rule Exception',
  APPROVED_CONTEXTUALLY = 'Approved Contextually',
  NEEDS_FOLLOWUP = 'Needs Follow-up',
  PENDING_REVIEW = 'Pending Review',
  TEAM_DECISION = 'Team Decision',
}

export const LABEL_OPTIONS = Object.values(NoteLabel);

export interface EditHistoryEntry {
  editedBy: string;
  editedAt: number;
  previousContent: string;
}

export interface ModNote {
  id: string; // UUID
  postId: string;
  subredditId: string;
  author: string; // moderator username
  content: string;
  label?: string | undefined;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  editHistory?: EditHistoryEntry[] | undefined;
}

export interface CreateNoteRequest {
  postId: string;
  subredditId: string;
  content: string;
  label?: string | undefined;
}

export interface UpdateNoteRequest {
  content: string;
  label?: string | undefined;
}

export interface NoteResponse {
  success: boolean;
  data?: ModNote | ModNote[] | undefined;
  error?: string | undefined;
}

export interface GetNotesResponse {
  success: boolean;
  notes: ModNote[];
  error?: string | undefined;
}

export interface FormSubmissionData {
  postId: string;
  subredditId: string;
  content: string;
  label?: string | undefined;
  action: 'create' | 'edit';
  noteId?: string | undefined; // required if action is 'edit'
}

