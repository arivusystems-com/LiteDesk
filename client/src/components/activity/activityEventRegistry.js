import ActivitySystemRow from './events/ActivitySystemRow.vue';
import ActivityCommentCard from './events/ActivityCommentCard.vue';
import ActivityEmailThreadCard from './events/ActivityEmailThreadCard.vue';

export const ACTIVITY_EVENT_COMPONENTS = {
  system: ActivitySystemRow,
  comment: ActivityCommentCard,
  email_thread: ActivityEmailThreadCard
};

export const getActivityEventComponent = (type) => {
  return ACTIVITY_EVENT_COMPONENTS[String(type || '').trim()] || ActivitySystemRow;
};
