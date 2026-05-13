/**
 * React components for displaying and managing mod notes
 */

import React, { useState, useEffect } from 'react';
import type { ModNote } from '../shared/types';
import { LABEL_OPTIONS } from '../shared/types';
import './styles.css';

interface NoteCardProps {
  note: ModNote;
  currentUser: string;
  isModeratorWithPermission: boolean;
  onDelete: (noteId: string) => void;
  onEdit: (note: ModNote) => void;
}

/**
 * NoteCard - Display a single mod note
 */
export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  currentUser,
  isModeratorWithPermission,
  onDelete,
  onEdit,
}) => {
  const canModify = note.author === currentUser || isModeratorWithPermission;
  const createdDate = new Date(note.createdAt).toLocaleString();
  const isEdited = note.updatedAt > note.createdAt;
  
  return (
    <div className="mod-note-card">
      <div className="mod-note-header">
        <div className="mod-note-meta">
          <span className="mod-note-author">by {note.author}</span>
          <span className="mod-note-time" title={createdDate}>
            {formatTimeAgo(note.createdAt)}
          </span>
          {isEdited && <span className="mod-note-edited">(edited)</span>}
        </div>
        
        {note.label && <span className="mod-note-label">{note.label}</span>}
        
        {canModify && (
          <div className="mod-note-actions">
            <button
              onClick={() => onEdit(note)}
              className="mod-note-btn mod-note-btn-edit"
              title="Edit note"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this note?')) {
                  onDelete(note.id);
                }
              }}
              className="mod-note-btn mod-note-btn-delete"
              title="Delete note"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      <p className="mod-note-content">{note.content}</p>
      
      {note.editHistory && note.editHistory.length > 0 && (
        <details className="mod-note-history">
          <summary>Edit history</summary>
          <ul>
            {note.editHistory.map((entry, idx) => (
              <li key={idx}>
                Edited by {entry.editedBy} on {new Date(entry.editedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

interface NoteListProps {
  postId: string;
  subredditId: string;
  currentUser: string;
  isModeratorWithPermission: boolean;
}

/**
 * NoteList - Display all notes for a post
 */
export const NoteList: React.FC<NoteListProps> = ({
  postId,
  subredditId,
  currentUser,
  isModeratorWithPermission,
}) => {
  const [notes, setNotes] = useState<ModNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchNotes();
  }, [postId, subredditId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/notes/${postId}?subredditId=${subredditId}`,
        {
          method: 'GET',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const data = await response.json();
      setNotes(data.notes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      const response = await fetch(
        `/api/notes/${noteId}?postId=${postId}&subredditId=${subredditId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note');
    }
  };

  const handleEdit = (note: ModNote) => {
    // Open edit modal/form
    console.log('Edit note:', note);
  };

  if (loading) {
    return <div className="mod-notes-loading">Loading notes...</div>;
  }

  if (error) {
    return <div className="mod-notes-error">{error}</div>;
  }

  if (notes.length === 0) {
    return <div className="mod-notes-empty">No mod notes for this post yet.</div>;
  }

  return (
    <div className="mod-notes-list">
      <h3 className="mod-notes-title">Mod Notes</h3>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          currentUser={currentUser}
          isModeratorWithPermission={isModeratorWithPermission}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
};

interface NoteComposerProps {
  onSubmit: (content: string, label?: string | undefined) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * NoteComposer - Form to add a new note
 */
export const NoteComposer: React.FC<NoteComposerProps> = ({
  onSubmit,
  isSubmitting,
}) => {
  const [content, setContent] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Note cannot be empty');
      return;
    }

    if (content.length < 5) {
      setError('Note must be at least 5 characters');
      return;
    }

    if (content.length > 500) {
      setError('Note must be 500 characters or less');
      return;
    }

    try {
      await onSubmit(content, label || undefined);
      setContent('');
      setLabel('');
    } catch (err) {
      console.error('Error submitting note:', err);
      setError('Failed to save note');
    }
  };

  return (
    <form className="mod-note-composer" onSubmit={handleSubmit}>
      <h3>Add Mod Note</h3>
      
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setError(null);
        }}
        placeholder="Explain why this post was approved, flagged, or allowed..."
        className="mod-note-input"
        maxLength={500}
        disabled={isSubmitting}
      />
      
      <div className="mod-note-composer-footer">
        <div className="mod-note-char-count">
          {content.length}/500
        </div>
        
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mod-note-label-select"
          disabled={isSubmitting}
        >
          <option value="">Category (optional)</option>
          {LABEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        
        <button
          type="submit"
          className="mod-note-btn-submit"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save Note'}
        </button>
      </div>
      
      {error && <div className="mod-note-error">{error}</div>}
    </form>
  );
};

/**
 * Utility function to format time ago
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}
