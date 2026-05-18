# Mod Notes Memo

**Private post-level mod notes for Reddit moderators. Document moderation decisions and preserve team context at the point of decision.**

## Problem Statement

Moderators frequently approve edge-case posts that technically violate minor rules but are kept up for community value, news relevance, or special context. The current Reddit moderation workflow offers a green approval checkmark, but **no built-in way to explain why** to other moderators. This creates:

- **Context Loss**: Other mods don't understand why an exception was made
- **Duplicate Work**: Mods ask "Why is this still up?" repeatedly in mod chat
- **Inconsistent Follow-up**: Without documented reasoning, different mods may reverse decisions
- **Time Waste**: Asynchronous teams across time zones repeat clarification conversations

## Solution

**Mod Notes Memo** is a Devvit mod tool that adds private internal notes directly to posts. Moderators can quickly document why they approved, flagged, or allowed a post—without leaving Reddit's interface. Notes are **mod-only, private, and persistent**, visible only to the moderation team.

## Key Features

### MVP (Launch Version)

- **Add Notes**: Quick form to add a brief note (5–500 characters) to any post  
- **View Notes**: See all notes on a post, sorted by most recent first  
- **Edit & Delete**: Modify or remove your own notes; senior mods can manage any note  
- **Labels/Categories**: Optional quick tags like "Rule Exception," "Approved Contextually," "Needs Follow-up," "Pending Review," "Team Decision"  
- **Metadata**: See author, creation time, edit history, and when a note was modified  
- **Mod-Only Visibility**: Notes never appear publicly or to post authors  
- **Persistent Storage**: Notes survive refreshes and are reliably stored via Devvit Redis  
- **Permission Enforcement**: Only moderators can view or create notes  

### Future Features (v2+)

- Note templates ("Approved contextually", "High-quality repost", etc.)
- Bulk note actions ("Quick approve with template note")
- Note search and filtering by label, date, author
- Auto-suggested labels based on context
- Subreddit-level analytics: % of exception posts documented, common exception types
- Slack/Discord relay (notify team of important notes)
- Export/audit logs for mod team reviews

## Use Cases

1. **Exception Approvals**: "Allowed despite Rule 3 because this is breaking news and already generating useful discussion."
2. **Context Preservation**: "Approved after OP added sources." / "Borderline off-topic, but high-value community resource."
3. **Escalations**: "Senior mod approved — do not remove unless comments derail."
4. **Follow-up Notes**: "Leave up; similar exception made last month." / "Revisit in 24h if no improvement."
5. **Team Decisions**: "Team consensus: exceptions allowed for posts matching X criteria."

## Architecture

### Tech Stack
- **Framework**: Devvit (Reddit's platform for building mod tools)
- **UI**: React + TypeScript (client)
- **Backend**: Hono (lightweight web framework) + Devvit server
- **Storage**: Devvit Redis (persistent key-value store)
- **Styling**: CSS (moderation-focused, minimal UI)

### Project Structure

```
src/
├── index.ts                    # Main server entry point
├── client/
│   ├── index.tsx              # React app entry point
│   ├── components.tsx         # NoteComposer, NoteList, NoteCard components
│   └── styles.css             # Component styles
├── server/
│   ├── api.ts                 # CRUD endpoints for notes
│   ├── menu.ts                # Menu item request handlers
│   ├── forms.ts               # Form submission handlers
│   └── storage.ts             # Note storage & validation utilities
├── shared/
│   └── types.ts               # Shared TypeScript types
└── routes/
    ├── menu.ts                # Deprecated (old template)
    └── modMemo.ts             # Deprecated (old template)

devvit.json                     # App configuration, menu items, forms
vite.config.ts                  # Vite build configuration
tsconfig.json                   # TypeScript configuration
```

### Data Model

```typescript
ModNote {
  id: string;                    // UUID
  postId: string;                // Reddit post ID
  subredditId: string;           // Reddit subreddit ID
  author: string;                // Username of mod who created note
  content: string;               // Note text (5-500 chars)
  label?: string;                // Optional category
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
  editHistory?: Array<{
    editedBy: string;
    editedAt: number;
    previousContent: string;
  }>;
}
```

**Storage Key**: `modnotes:{subredditId}:{postId}` → JSON array of ModNote objects

## Getting Started

### Installation

1. **Prerequisites**
   ```bash
   node --version  # Should be >= 22.2.0
   npm list -g devvit  # Should have Devvit CLI installed
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure development subreddit**
   - Create or use a test subreddit
   - Update `devvit.json`: Change `dev.subreddit` to your test subreddit

### Development

```bash
# Start development mode (builds and watches for changes)
npm run dev

# This will launch Devvit Playtest in your configured development subreddit
# You can then interact with the app in a live Reddit environment
```

### Testing the App

1. Go to your development subreddit
2. Create or find any post
3. Click the "Add Mod Note" menu item (three-dot menu on the post)
4. Fill out the form:
   - **Mod Note**: Enter 5–500 character note
   - **Category**: Optionally select a label
5. Click "Save Note"
6. The note appears below the form
7. Click the pencil icon to edit, trash icon to delete

### Building for Submission

```bash
# Type-check your code
npm run type-check

# Lint your code
npm run lint

# Run tests (if any)
npm run test

# Build for production
npm run build

# Upload to Devvit (requires authentication)
npm run deploy

# Publish to the Devvit app store
npm run launch
```

## API Endpoints

### GET `/api/notes/:postId?subredditId=X`
Fetch all notes for a post (moderator only).

**Response:**
```json
{
  "success": true,
  "notes": [
    {
      "id": "uuid",
      "postId": "t3_abc123",
      "subredditId": "t5_xyz",
      "author": "mod_username",
      "content": "Approved due to community precedent.",
      "label": "Rule Exception",
      "createdAt": 1715000000000,
      "updatedAt": 1715000000000,
      "editHistory": []
    }
  ]
}
```

### POST `/api/notes`
Create a new note.

**Request:**
```json
{
  "postId": "t3_abc123",
  "subredditId": "t5_xyz",
  "content": "Brief note here",
  "label": "Approved Contextually"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* ModNote object */ }
}
```

### PUT `/api/notes/:noteId`
Update an existing note (author or senior mod only).

**Request:**
```json
{
  "postId": "t3_abc123",
  "subredditId": "t5_xyz",
  "content": "Updated note text",
  "label": "Team Decision"
}
```

### DELETE `/api/notes/:noteId?postId=X&subredditId=Y`
Delete a note (author or senior mod only).

## Permissions & Security

- **Read Access**: Moderators of the subreddit only
- **Write Access**: All moderators (authors can edit/delete their own; senior mods can manage any)
- **Public Visibility**: None (notes never appear in public)
- **Post Author Visibility**: None (post authors cannot see mod notes)
- **Data Validation**: Input length, content sanitization, required field checks

## Performance & Reliability

- **Storage**: Persistent Devvit Redis with automatic failover
- **Concurrency**: Notes are stored as arrays; eventual consistency model (reliable on refresh)
- **Load States**: UI shows loading, success, and error states
- **Offline Resilience**: Form validation works offline; submission retries on reconnect

## Hackathon Submission Angle

**Title**: "Mod Notes Memo: Documentation at the Point of Decision"

**Problem**: Moderators make exception-based decisions daily (approve rule-violating posts for good reason) but have no built-in way to document why. This creates context loss, duplicate clarification work, and inconsistent follow-up.

**Solution**: Post-level private mod notes that let teams document rationale instantly—no modmail, no DMs, no Discord hop.

**Impact**:
- **Time Savings**: Clarification time from minutes to seconds
- **Consistency**: Exception decisions documented and visible to entire mod team
- **Metrics**:
  - Median time for a second mod to understand why an exception post was approved
  - Reduction in mod-chat clarification requests
  - % of exception posts with documented rationale
  - Reduction in conflicting or reversed follow-up actions

**Why This Matters for Reddit**:
- Aligns with Devvit's goal: subreddit-installed tools that reduce mod repetitive work
- Solves real pain point in asynchronous, large mod teams
- Improves moderation consistency and transparency
- Polished, reliable, production-ready first version

## Contributing & Future Work

Contributions welcome! Areas for future development:
- Real-time note sync (via Devvit WebSockets if available)
- Advanced filtering & search
- Analytics dashboard for mod teams
- Two-factor auth for sensitive subreddits
- Integration with modmail/mod action logs

## License

BSD-3-Clause (matches Devvit template)

---

**Built for the Reddit Mod Tools & Migrated Apps Hackathon**  
Solving a real moderator pain point with a polished Devvit mod tool.

    ├── menu.ts       # Context menu item handlers
    └── triggers.ts   # App lifecycle triggers
```

## Customizing Your Mod Tool

This template is designed to be easily customizable:

1. **Modify existing actions**: Edit the nuke functionality in `src/core/nuke.ts`
2. **Add new menu items**: Update `devvit.json` and add handlers in `src/routes/menu.ts`
3. **Create new forms**: Add form definitions and handlers in `src/routes/forms.ts`
4. **Add API endpoints**: Extend `src/routes/api.ts` for external integrations

## Commands

- `npm run dev`: Starts development mode with live reload on your test subreddit
- `npm run build`: Builds your mod tool for production
- `npm run deploy`: Uploads a new version of your app to Reddit
- `npm run launch`: Publishes your app for review and public use
- `npm run login`: Authenticates your CLI with Reddit
- `npm run type-check`: Runs TypeScript type checking, linting, and formatting

## How It Works

The template demonstrates Reddit mod tool development through the "Mop" feature:

1. **Context Menu Integration**: Click on the Mod Shield icon in a comment to see custom mod actions
2. **Permission Validation**: Automatically checks if the user has moderation permissions
3. **Interactive Forms**: Presents options through Reddit's native form system
4. **Reddit API**: Processes multiple comments using Reddit's API

## Development Notes

- **Permissions**: The app requires `reddit: true` permission to access Reddit's API
- **User Types**: Menu items are restricted to `moderator` user type

## Deployment

1. Test thoroughly in your development subreddit
2. Run `npm run deploy` to upload your app
3. Use `npm run launch` to submit for Reddit's app review process
4. Once approved, users can install your mod tool from Reddit's app directory

This template provides everything you need to build powerful, user-friendly moderation tools for Reddit communities.
