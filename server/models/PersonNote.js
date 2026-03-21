/**
 * Person notes stored outside the People document (People schema has no embedded notes).
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PersonNoteSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    personId: { type: Schema.Types.ObjectId, ref: 'People', required: true, index: true },
    text: { type: String, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
    appContext: { type: String },
    updated_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

PersonNoteSchema.index({ organizationId: 1, personId: 1, created_at: -1 });

module.exports = mongoose.model('PersonNote', PersonNoteSchema);
