/**
 * Main client entry point for Mod Notes Memo web interface
 * This renders the mod notes interface that can be embedded or displayed to moderators
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NoteComposer, NoteList } from './components';
import './styles.css';

/**
 * Main App Component
 */
const App: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get post and subreddit IDs from URL params or window context
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('postId') || 'unknown';
  const subredditId = urlParams.get('subredditId') || 'unknown';
  const currentUser = urlParams.get('user') || 'unknown_mod';
  const isModWithPermission = urlParams.get('isModWithPermission') === 'true';

  const handleNoteSubmit = async (content: string, label?: string | undefined) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Name': currentUser,
          'X-Is-Mod': 'true',
        },
        body: JSON.stringify({
          postId,
          subredditId,
          content,
          label,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as Record<string, unknown>)?.error as string || 'Failed to create note');
      }

      // Success - note was created, refresh the list
      window.location.reload();
    } catch (error) {
      console.error('Error submitting note:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mod-notes-app">
      <div className="mod-notes-container">
        <header className="mod-notes-header">
          <h1>📝 Mod Notes Memo</h1>
          <p className="mod-only-badge">🔒 Mod only • Private notes for this post</p>
        </header>

        <main className="mod-notes-main">
          <NoteComposer
            onSubmit={handleNoteSubmit}
            isSubmitting={isSubmitting}
          />

          <NoteList
            postId={postId}
            subredditId={subredditId}
            currentUser={currentUser}
            isModeratorWithPermission={isModWithPermission}
          />
        </main>
      </div>
    </div>
  );
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root container not found');
}

export default App;
