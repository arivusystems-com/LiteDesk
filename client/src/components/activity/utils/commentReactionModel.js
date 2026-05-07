const REACTION_KEY_TO_EMOJI = Object.freeze({
  like: '👍',
  likes: '👍',
  thumbsup: '👍',
  thumbs_up: '👍',
  'thumbs-up': '👍',
  love: '❤️',
  heart: '❤️',
  laugh: '😂',
  joy: '😂',
  smile: '🙂',
  wow: '😮',
  celebrate: '🎉',
  tada: '🎉',
  rocket: '🚀',
  clap: '👏',
  thinking: '🤔',
  party: '🥳',
  fire: '🔥'
});

export const normalizeReactionEmoji = (value) => String(value || '').trim();
export const normalizeReactionKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

export const coerceReactionCount = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    if (typeof value.count === 'number' && Number.isFinite(value.count)) return value.count;
    if (typeof value.total === 'number' && Number.isFinite(value.total)) return value.total;
    if (Array.isArray(value.users)) return value.users.length;
    if (Array.isArray(value.userIds)) return value.userIds.length;
    if (Array.isArray(value.reactors)) return value.reactors.length;
  }
  return 0;
};

export const toReactionEmoji = (value) => {
  const key = normalizeReactionKey(value);
  if (!key) return '';
  if (REACTION_KEY_TO_EMOJI[key]) return REACTION_KEY_TO_EMOJI[key];
  if (/[^\x00-\x7F]/.test(key)) return String(value || '');
  return '';
};

const resolveReactionToken = (value) => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return String(
      value.emoji
      || value.reaction
      || value.type
      || value.name
      || value.key
      || value.value
      || ''
    );
  }
  return '';
};

const toCanonicalReactionEmoji = (value) => {
  const token = normalizeReactionEmoji(resolveReactionToken(value));
  if (!token) return '';
  const mapped = toReactionEmoji(token);
  return mapped || token;
};

export const mergeReactionUsers = (existingUsers = [], incomingUsers = []) => {
  const merged = [];
  const seen = new Set();
  [...existingUsers, ...incomingUsers].forEach((reactor) => {
    if (!reactor) return;
    if (typeof reactor === 'string' || typeof reactor === 'number') {
      const primitive = String(reactor).trim();
      if (!primitive) return;
      const dedupeKey = `${primitive}|${primitive}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      merged.push({ id: primitive, name: primitive, avatar: '' });
      return;
    }
    const rawId = reactor.id || reactor._id || reactor.userId || '';
    const rawName = reactor.name
      || [reactor.firstName, reactor.lastName].filter(Boolean).join(' ').trim()
      || reactor.username
      || reactor.email
      || '';
    if (!rawId && !rawName) return;
    const normalized = {
      id: rawId ? String(rawId) : String(rawName).toLowerCase(),
      name: rawName || 'Unknown',
      avatar: reactor.avatar || ''
    };
    const dedupeKey = `${normalized.id}|${normalized.name}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    merged.push(normalized);
  });
  return merged;
};

export const normalizeMyReactions = (myReactions = []) => (
  (Array.isArray(myReactions) ? myReactions : [])
    .map((value) => toCanonicalReactionEmoji(value))
    .filter(Boolean)
);

export const buildCommentReactions = (event, options = {}) => {
  const {
    includeLikesFallback = true,
    includeOnlyComments = false
  } = options;

  if (!event) return [];
  if (includeOnlyComments && event.type !== 'comment') return [];

  const merged = new Map();
  const upsert = (emoji, count, reactors = []) => {
    const normalizedEmoji = toCanonicalReactionEmoji(emoji);
    if (!normalizedEmoji) return;
    const normalizedCount = Math.max(0, Number(count) || 0);
    const existing = merged.get(normalizedEmoji) || { count: 0, reactors: [] };
    const nextCount = existing.count + normalizedCount;
    const nextReactors = mergeReactionUsers(existing.reactors, reactors);
    if (!nextCount && !nextReactors.length) {
      merged.delete(normalizedEmoji);
      return;
    }
    merged.set(normalizedEmoji, { count: nextCount, reactors: nextReactors });
  };

  const reactions = event.reactions;
  if (Array.isArray(reactions)) {
    reactions.forEach((reaction) => {
      if (!reaction) return;
      const emoji = reaction.emoji || reaction.reaction || toReactionEmoji(reaction.type || reaction.name || reaction.key);
      const count = coerceReactionCount(reaction.count ?? reaction.total ?? reaction.users ?? reaction.userIds ?? reaction.reactors);
      const reactors = reaction.reactors || reaction.users || [];
      upsert(emoji, count, reactors);
    });
  } else if (reactions && typeof reactions === 'object') {
    Object.entries(reactions).forEach(([key, value]) => {
      if (!value) return;
      const emoji = value.emoji || value.reaction || toReactionEmoji(key);
      const count = coerceReactionCount(value);
      const reactors = value.reactors || value.users || [];
      upsert(emoji, count, reactors);
    });
  }

  if (includeLikesFallback) {
    const likesCount = coerceReactionCount(event.likesCount ?? event.likes);
    if (!merged.has('👍')) upsert('👍', likesCount, []);
  }

  return Array.from(merged.entries())
    .map(([emoji, data]) => ({ emoji, count: data.count, reactors: data.reactors || [] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
};

export const isCommentReactionSelectedForUser = ({ event, emoji, currentUserId, getCommentReactions }) => {
  const normalizedEmoji = toCanonicalReactionEmoji(emoji);
  if (!normalizedEmoji) return false;

  const myReactions = normalizeMyReactions(event?.myReactions || []);
  if (myReactions.includes(normalizedEmoji)) return true;

  const currentId = String(currentUserId || '').trim();
  if (!currentId) return false;

  const reactions = typeof getCommentReactions === 'function'
    ? getCommentReactions(event)
    : buildCommentReactions(event);
  const reaction = (reactions || []).find((entry) => entry?.emoji === normalizedEmoji);
  return Array.isArray(reaction?.reactors)
    && reaction.reactors.some((reactor) => String(
      reactor?.id
      || reactor?._id
      || reactor?.userId
      || reactor?.user?.id
      || reactor?.user?._id
      || reactor
      || ''
    ) === currentId);
};
