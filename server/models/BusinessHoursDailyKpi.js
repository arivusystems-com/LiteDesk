'use strict';

const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const { Schema } = mongoose;

const businessHoursDailyKpiSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    /** Calendar date in schedule timezone (YYYY-MM-DD) */
    date: { type: String, required: true, trim: true, index: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'BusinessHourSet', default: null },
    scheduleName: { type: String, default: 'Default', trim: true },
    timezone: { type: String, default: 'UTC', trim: true },
    businessMinutesAvailable: { type: Number, default: 0, min: 0 },
    activitiesInsideHours: { type: Number, default: 0, min: 0 },
    activitiesOutsideHours: { type: Number, default: 0, min: 0 },
    /** Agent/case work logged outside business hours */
    overtimeCount: { type: Number, default: 0, min: 0 },
    slaBreachesOffHours: { type: Number, default: 0, min: 0 },
    assignmentDeferredCount: { type: Number, default: 0, min: 0 },
    automationDeferredCount: { type: Number, default: 0, min: 0 },
    utilizationPercent: { type: Number, default: 0, min: 0, max: 100 }
  },
  { timestamps: true }
);

businessHoursDailyKpiSchema.index(
  { organizationId: 1, date: 1 },
  { unique: true }
);

module.exports = wrapTenantModel(mongoose.model('BusinessHoursDailyKpi', businessHoursDailyKpiSchema));
