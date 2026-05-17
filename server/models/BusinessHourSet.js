'use strict';

const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');
const { buildDefaultWeek } = require('../constants/businessHoursDefaults');

const { Schema } = mongoose;

const timeRangeSchema = new Schema({
  start: { type: String, required: true, trim: true },
  end: { type: String, required: true, trim: true }
}, { _id: false });

const weekDaySchema = new Schema({
  day: { type: Number, required: true, min: 0, max: 6 },
  enabled: { type: Boolean, default: false },
  windows: { type: [timeRangeSchema], default: [] },
  breaks: { type: [timeRangeSchema], default: [] }
}, { _id: false });

const linkedToSchema = new Schema({
  type: {
    type: String,
    enum: ['company', 'group', 'user'],
    required: true
  },
  id: { type: Schema.Types.ObjectId, default: null }
}, { _id: false });

const businessHourSetSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  timezone: { type: String, required: true, trim: true, default: 'UTC' },
  week: {
    type: [weekDaySchema],
    default: () => buildDefaultWeek()
  },
  holidayCalendarId: {
    type: Schema.Types.ObjectId,
    ref: 'HolidayCalendar',
    default: null
  },
  overtimeAllowed: { type: Boolean, default: false },
  linkedTo: {
    type: linkedToSchema,
    default: () => ({ type: 'company', id: null })
  },
  isDefault: { type: Boolean, default: false, index: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  effectiveFrom: { type: Date, default: null },
  effectiveTo: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

businessHourSetSchema.index(
  { organizationId: 1, 'linkedTo.type': 1, 'linkedTo.id': 1 },
  { unique: true, partialFilterExpression: { status: 'active', 'linkedTo.type': { $in: ['group', 'user'] } } }
);

businessHourSetSchema.index(
  { organizationId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

module.exports = wrapTenantModel(mongoose.model('BusinessHourSet', businessHourSetSchema));
