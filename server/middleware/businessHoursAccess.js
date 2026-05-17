'use strict';

function isSettingsAdmin(user) {
  if (!user) return false;
  if (user.isOwner) return true;
  if (String(user.role || '').toLowerCase() === 'admin') return true;
  return Boolean(user.permissions?.settings?.edit);
}

function canManageBusinessHourSets(user) {
  return isSettingsAdmin(user);
}

function canEditPersonalSchedule(user, linkedUserId) {
  if (!user?._id || !linkedUserId) return false;
  if (String(user._id) === String(linkedUserId)) return true;
  return canManageBusinessHourSets(user);
}

module.exports = {
  isSettingsAdmin,
  canManageBusinessHourSets,
  canEditPersonalSchedule
};
