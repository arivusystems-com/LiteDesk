'use strict';

const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const { Schema } = mongoose;

const holidayDateSchema = new Schema({
  date: {
    type: String,
    required: true,
    trim: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  name: { type: String, required: true, trim: true, maxlength: 120 }
}, { _id: false });

const holidayCalendarSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  region: { type: String, trim: true, maxlength: 80, default: '' },
  dates: { type: [holidayDateSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  modifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

holidayCalendarSchema.index({ organizationId: 1, name: 1 });

module.exports = wrapTenantModel(mongoose.model('HolidayCalendar', holidayCalendarSchema));
