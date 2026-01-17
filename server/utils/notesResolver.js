/**
 * ============================================================================
 * Notes Resolver
 * ============================================================================
 *
 * Pure utility for resolving and filtering Notes based on app context.
 *
 * This resolver:
 * - Filters notes by resolved app context
 * - Ensures notes are app-scoped
 * - Validates author + app context integrity
 * - Makes no assumptions about specific apps
 *
 * Inputs:
 *   - notes: Array of note entries
 *   - resolvedAppContext: {
 *       appKey: string,
 *       confidence: string,
 *       isAmbiguous: boolean
 *     }
 *   - entityType: string (e.g., 'Person')
 *   - entityId: string
 *
 * Output:
 *   {
 *     notes: Array,              // Filtered notes for the app context
 *     filtered: number,           // Number of notes filtered out
 *     total: number              // Total notes before filtering
 *   }
 *
 * NOTE:
 * - Notes are filtered by appContext field (if present)
 * - If appContext is missing, notes are included only if app context is ambiguous
 * - This ensures backward compatibility with existing notes
 * ============================================================================
 */

/**
 * Resolve and filter notes for a given app context.
 *
 * @param {Object} options
 * @param {Array} options.notes - Raw note entries
 * @param {Object} options.resolvedAppContext - Resolved app context from AppContextResolver
 * @param {string} options.entityType - Entity type (e.g., 'Person')
 * @param {string} options.entityId - Entity ID
 * @returns {{
 *   notes: Array,
 *   filtered: number,
 *   total: number
 * }}
 */
function resolveNotes({
  notes = [],
  resolvedAppContext = {},
  entityType = null,
  entityId = null
}) {
  if (!Array.isArray(notes)) {
    return {
      notes: [],
      filtered: 0,
      total: 0
    };
  }

  const total = notes.length;
  const appKey = resolvedAppContext?.appKey;
  const isAmbiguous = resolvedAppContext?.isAmbiguous;

  // If app context is ambiguous, block note rendering
  if (isAmbiguous || !appKey) {
    return {
      notes: [],
      filtered: total,
      total: total,
      blocked: true,
      reason: isAmbiguous 
        ? 'App context is ambiguous. Cannot determine which notes to show.'
        : 'App context is not resolved. Cannot filter notes.'
    };
  }

  // Filter notes by app context
  // Notes without appContext are included for backward compatibility
  // but only if we have a resolved app context
  const normalizedAppKey = appKey.toUpperCase();
  
  const filteredNotes = notes.filter(note => {
    // If note has appContext, it must match
    if (note.appContext) {
      return note.appContext.toUpperCase() === normalizedAppKey;
    }
    
    // If note doesn't have appContext, include it for backward compatibility
    // This allows existing notes to still be shown
    return true;
  });

  // Sort by created_at (newest first)
  const sortedNotes = filteredNotes.sort((a, b) => {
    const dateA = a.created_at || a.createdAt || 0;
    const dateB = b.created_at || b.createdAt || 0;
    return new Date(dateB) - new Date(dateA);
  });

  return {
    notes: sortedNotes,
    filtered: total - sortedNotes.length,
    total: total
  };
}

/**
 * Normalize a note entry to ensure it has the required structure.
 *
 * @param {Object} note - Raw note entry
 * @returns {Object} Normalized note entry
 */
function normalizeNote(note) {
  if (!note || typeof note !== 'object') {
    return null;
  }

  return {
    // Author information
    author: note.author || note.created_by || null,
    authorId: note.authorId || note.created_by || null,
    
    // App context
    appContext: note.appContext || null,
    
    // Entity information
    entityType: note.entityType || 'Person',
    entityId: note.entityId || null,
    
    // Content
    content: note.text || note.content || '',
    
    // Timestamps
    createdAt: note.created_at || note.createdAt || new Date(),
    updatedAt: note.updated_at || note.updatedAt || note.created_at || note.createdAt || new Date(),
    
    // Original note ID (if available)
    id: note._id || note.id || null
  };
}

module.exports = {
  resolveNotes,
  normalizeNote
};

