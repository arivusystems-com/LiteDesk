const Form = require('../models/Form');
const FormResponse = require('../models/FormResponse');
const FormKPIs = require('../models/FormKPIs');
const Task = require('../models/Task');
const formScoringService = require('./formScoringService');

/**
 * Process form submission
 * @param {Object} params - Submission parameters
 * @returns {Promise<FormResponse>} Processed response
 */
exports.processSubmission = async (params) => {
    const { form, responseDetails, linkedTo, organizationId, submittedBy, ipAddress, userAgent, existingResponse } = params;
    
    try {
        // Validate responses against form structure
        const validation = await validateSubmission(form, responseDetails);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        // Calculate scores using scoring service
        const scoredResponse = await formScoringService.scoreResponse(form, responseDetails);
        
        // Ensure responseDetails have section/subsection IDs (if not already set)
        scoredResponse.responseDetails = scoredResponse.responseDetails.map(detail => {
            // If sectionId and subsectionId are already set, keep them
            if (detail.sectionId) {
                return detail;
            }
            
            // Find which section/subsection contains this question
            for (const section of form.sections) {
                // Check section-level questions first
                if (section.questions && Array.isArray(section.questions)) {
                    const foundQuestion = section.questions.find(q => q.questionId === detail.questionId);
                    if (foundQuestion) {
                        detail.sectionId = section.sectionId;
                        // No subsectionId for section-level questions
                        return detail;
                    }
                }
                
                // Check subsection-level questions
                if (section.subsections && Array.isArray(section.subsections)) {
                    for (const subsection of section.subsections) {
                        if (subsection.questions && Array.isArray(subsection.questions)) {
                            const foundQuestion = subsection.questions.find(q => q.questionId === detail.questionId);
                            if (foundQuestion) {
                                detail.sectionId = section.sectionId;
                                detail.subsectionId = subsection.subsectionId;
                                return detail;
                            }
                        }
                    }
                }
            }
            return detail;
        });
        
        // Validate form has _id
        if (!form || !form._id) {
            throw new Error('Form ID is missing');
        }
        
        // Validate organizationId
        if (!organizationId) {
            throw new Error('Organization ID is missing');
        }
        
        // Check if response already exists (from event check-in)
        // First check if existingResponse was passed (from responseId parameter)
        let formResponse = existingResponse || null;
        
        console.log('[processSubmission] Checking for existing response:', {
            hasExistingResponse: !!existingResponse,
            existingResponseId: existingResponse?._id?.toString(),
            existingResponseStatus: existingResponse?.executionStatus,
            hasLinkedTo: !!(linkedTo && linkedTo.type === 'Event' && linkedTo.id),
            linkedToId: linkedTo?.id?.toString(),
            linkedToType: linkedTo?.type
        });
        
        // If existingResponse was provided, use it and skip further lookup
        if (formResponse) {
            console.log('[processSubmission] ✅ Using provided existingResponse, skipping eventId lookup');
        }
        
        // If not found by responseId, try to find by event+form combination
        // BUT ONLY if existingResponse was not provided (to avoid unnecessary queries)
        if (!formResponse && linkedTo && linkedTo.type === 'Event' && linkedTo.id) {
            const mongoose = require('mongoose');
            const Event = require('../models/Event');
            const eventId = linkedTo.id;
            
            // Try to find the event to get its ObjectId
            // Events can be identified by either _id or eventId
            let eventObjectId = null;
            if (mongoose.Types.ObjectId.isValid(eventId) && eventId.toString().length === 24) {
                // It's already an ObjectId format
                eventObjectId = new mongoose.Types.ObjectId(eventId);
            } else {
                // It's likely a UUID string - find the event by eventId to get its _id
                const event = await Event.findOne({
                    eventId: eventId,
                    organizationId: organizationId
                }).select('_id');
                if (event) {
                    eventObjectId = event._id;
                }
            }
            
            // Build query to find existing response
            // First, try to find ANY response for this event+form combination (regardless of status)
            // This ensures we update the response created during check-in instead of creating a duplicate
            if (eventObjectId) {
                // Use aggregation to find response with string comparison (more reliable than ObjectId comparison)
                // This handles cases where ObjectId instances don't match exactly
                const mongoose = require('mongoose');
                const responses = await FormResponse.aggregate([
                    {
                        $match: {
                            formId: mongoose.Types.ObjectId.isValid(form._id) 
                                ? new mongoose.Types.ObjectId(form._id) 
                                : form._id,
                            organizationId: mongoose.Types.ObjectId.isValid(organizationId)
                                ? new mongoose.Types.ObjectId(organizationId)
                                : organizationId,
                            'linkedTo.type': 'Event'
                        }
                    },
                    {
                        $addFields: {
                            linkedToIdString: { $toString: '$linkedTo.id' },
                            eventObjectIdString: eventObjectId.toString()
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: ['$linkedToIdString', '$eventObjectIdString']
                            }
                        }
                    }
                ]);
                
                if (responses && responses.length > 0) {
                    // Convert back to document
                    formResponse = await FormResponse.findById(responses[0]._id);
                    console.log('[processSubmission] Found existing response via aggregation:', {
                        responseId: formResponse._id,
                        executionStatus: formResponse.executionStatus,
                        eventObjectId: eventObjectId.toString()
                    });
                } else {
                    // Fallback to direct query
                    let query = {
                        formId: form._id,
                        organizationId: organizationId,
                        'linkedTo.type': 'Event',
                        'linkedTo.id': eventObjectId
                    };
                    formResponse = await FormResponse.findOne(query);
                    
                    if (formResponse) {
                        console.log('[processSubmission] Found existing response via direct query:', {
                            responseId: formResponse._id,
                            executionStatus: formResponse.executionStatus
                        });
                    } else {
                        console.log('[processSubmission] No existing response found for event:', eventObjectId.toString());
                    }
                }
            } else {
                // If we couldn't convert to ObjectId, try finding by the original eventId string
                // This handles cases where the event lookup failed
                console.warn('[processSubmission] Could not convert eventId to ObjectId, trying string match:', eventId);
                formResponse = await FormResponse.findOne({
                    formId: form._id,
                    organizationId: organizationId,
                    'linkedTo.type': 'Event',
                    $or: [
                        { 'linkedTo.id': eventId },
                        { 'linkedTo.id': eventId.toString() }
                    ]
                });
            }
        }
        
        if (formResponse) {
            // Update existing response (from event check-in)
            console.log('[processSubmission] ✅ Updating existing response:', {
                responseId: formResponse._id.toString(),
                currentStatus: formResponse.executionStatus,
                willUpdateTo: 'Submitted',
                foundBy: existingResponse ? 'responseId' : 'eventId'
            });
            
            // Prevent duplicate creation - if response is already submitted, log warning
            if (formResponse.executionStatus === 'Submitted') {
                console.warn('[processSubmission] ⚠️ Response already submitted, updating anyway:', {
                    responseId: formResponse._id.toString(),
                    submittedAt: formResponse.submittedAt
                });
            }
            
            formResponse.responseDetails = scoredResponse.responseDetails;
            formResponse.sectionScores = scoredResponse.sectionScores;
            formResponse.kpis = scoredResponse.kpis;
            formResponse.executionStatus = 'Submitted';
            // reviewStatus will be computed automatically by pre-save hook
            formResponse.submittedAt = new Date();
            formResponse.submittedBy = submittedBy || formResponse.submittedBy;
            formResponse.ipAddress = ipAddress || formResponse.ipAddress;
            formResponse.userAgent = userAgent || formResponse.userAgent;
            await formResponse.save();
            
            console.log('[processSubmission] ✅ Successfully updated existing response');
        } else {
            // Create new response document
            // BUT FIRST: Double-check if we should really create a new one
            // This is a safety check to prevent duplicates
            console.log('[processSubmission] ⚠️ No existing response found, checking one more time before creating...');
            
            // Final safety check: if linkedTo is Event, try one more time with a broader query
            if (linkedTo && linkedTo.type === 'Event' && linkedTo.id) {
                const mongoose = require('mongoose');
                const finalCheck = await FormResponse.findOne({
                    formId: form._id,
                    organizationId: organizationId,
                    'linkedTo.type': 'Event'
                }).sort({ createdAt: -1 }); // Get most recent
                
                if (finalCheck) {
                    // Check if linkedTo.id matches (using string comparison for safety)
                    const finalCheckLinkedId = finalCheck.linkedTo?.id?.toString();
                    const providedLinkedId = linkedTo.id?.toString();
                    
                    if (finalCheckLinkedId === providedLinkedId) {
                        console.log('[processSubmission] ✅ Found existing response in final safety check, using it instead of creating new one:', {
                            responseId: finalCheck._id.toString(),
                            executionStatus: finalCheck.executionStatus
                        });
                        formResponse = finalCheck;
                        
                        // Update it
                        formResponse.responseDetails = scoredResponse.responseDetails;
                        formResponse.sectionScores = scoredResponse.sectionScores;
                        formResponse.kpis = scoredResponse.kpis;
                        formResponse.executionStatus = 'Submitted';
                        formResponse.submittedAt = new Date();
                        formResponse.submittedBy = submittedBy || formResponse.submittedBy;
                        formResponse.ipAddress = ipAddress || formResponse.ipAddress;
                        formResponse.userAgent = userAgent || formResponse.userAgent;
                        await formResponse.save();
                        
                        console.log('[processSubmission] ✅ Successfully updated response from final safety check');
                    } else {
                        console.log('[processSubmission] Final check found response but linkedTo.id mismatch:', {
                            foundId: finalCheckLinkedId,
                            providedId: providedLinkedId,
                            willCreateNew: true
                        });
                    }
                }
            }
            
            // Only create new response if we still don't have one
            if (!formResponse) {
                console.log('[processSubmission] Creating new response with:', {
                    formId: form._id.toString(),
                    organizationId: organizationId.toString(),
                    linkedTo: linkedTo
                });
                
                // reviewStatus will be computed automatically by pre-save hook based on business rules
                const responseData = {
                    organizationId: organizationId.toString ? organizationId.toString() : organizationId,
                    formId: form._id.toString ? form._id.toString() : form._id,
                    linkedTo: linkedTo || null,
                    submittedBy: submittedBy || null,
                    submittedAt: new Date(),
                    responseDetails: scoredResponse.responseDetails,
                    sectionScores: scoredResponse.sectionScores,
                    kpis: scoredResponse.kpis,
                    executionStatus: 'Submitted',
                    approved: false, // Initially not approved
                    ipAddress,
                    userAgent
                };
                
                formResponse = await FormResponse.create(responseData);
                console.log('[processSubmission] ✅ Created new response:', formResponse._id.toString());
            }
        }
        
        // Update form analytics
        await updateFormAnalytics(form._id.toString ? form._id.toString() : form._id, organizationId.toString ? organizationId.toString() : organizationId);
        
        // Trigger workflows
        await triggerWorkflows(form, formResponse);
        
        // Create corrective task if needed (check computed status)
        if (formResponse.reviewStatus === 'Pending Corrective Action') {
            await createCorrectiveTask(form, formResponse, organizationId);
        }
        
        // Populate and return
        return await FormResponse.findById(formResponse._id)
            .populate('submittedBy', 'firstName lastName email')
            .populate('linkedTo.id');
    } catch (error) {
        console.error('Process submission error:', error);
        throw error;
    }
};

/**
 * Validate submission against form structure
 */
async function validateSubmission(form, responseDetails) {
    // Check if form has sections and questions
    if (!form.sections || form.sections.length === 0) {
        return { valid: false, error: 'Form has no sections' };
    }
    
    // Collect all question IDs from form (section-level and subsection-level)
    const formQuestionIds = new Set();
    form.sections.forEach(section => {
        // Check section-level questions
        if (section.questions && Array.isArray(section.questions)) {
            section.questions.forEach(question => {
                if (question.questionId) {
                    formQuestionIds.add(question.questionId);
                }
            });
        }
        
        // Check subsection-level questions
        if (section.subsections && Array.isArray(section.subsections)) {
            section.subsections.forEach(subsection => {
                if (subsection.questions && Array.isArray(subsection.questions)) {
                    subsection.questions.forEach(question => {
                        if (question.questionId) {
                            formQuestionIds.add(question.questionId);
                        }
                    });
                }
            });
        }
    });
    
    // Check if all mandatory questions are answered
    const answeredQuestionIds = new Set(responseDetails.map(detail => detail.questionId));
    
    for (const section of form.sections) {
        // Check section-level mandatory questions
        if (section.questions && Array.isArray(section.questions)) {
            for (const question of section.questions) {
                if (question.mandatory && !answeredQuestionIds.has(question.questionId)) {
                    return { 
                        valid: false, 
                        error: `Mandatory question "${question.questionText}" is not answered` 
                    };
                }
            }
        }
        
        // Check subsection-level mandatory questions
        if (section.subsections && Array.isArray(section.subsections)) {
            for (const subsection of section.subsections) {
                if (subsection.questions && Array.isArray(subsection.questions)) {
                    for (const question of subsection.questions) {
                        if (question.mandatory && !answeredQuestionIds.has(question.questionId)) {
                            return { 
                                valid: false, 
                                error: `Mandatory question "${question.questionText}" is not answered` 
                            };
                        }
                    }
                }
            }
        }
    }
    
    // Check for invalid question IDs
    for (const detail of responseDetails) {
        if (!formQuestionIds.has(detail.questionId)) {
            return { 
                valid: false, 
                error: `Invalid question ID: ${detail.questionId}` 
            };
        }
    }
    
    return { valid: true };
}

/**
 * Determine initial status based on KPIs
 * @deprecated Status is now computed automatically based on business rules in FormResponse model
 * This function is kept for reference but is no longer used
 */
function determineInitialStatus(form, kpis) {
    // Status is now computed automatically by FormResponse.computeReviewStatus()
    // This function is deprecated and kept for reference only
    return null;
}

/**
 * Update form analytics
 */
async function updateFormAnalytics(formId, organizationId) {
    try {
        if (!formId || !organizationId) {
            console.error('updateFormAnalytics: Missing formId or organizationId', { formId, organizationId });
            return;
        }
        
        // Convert to ObjectId if needed
        const mongoose = require('mongoose');
        const formObjectId = mongoose.Types.ObjectId.isValid(formId) 
            ? (formId instanceof mongoose.Types.ObjectId ? formId : new mongoose.Types.ObjectId(formId))
            : null;
        const orgObjectId = mongoose.Types.ObjectId.isValid(organizationId)
            ? (organizationId instanceof mongoose.Types.ObjectId ? organizationId : new mongoose.Types.ObjectId(organizationId))
            : null;
        
        if (!formObjectId || !orgObjectId) {
            console.error('updateFormAnalytics: Invalid ObjectId', { formId, organizationId, formObjectId, orgObjectId });
            return;
        }
        
        const form = await Form.findById(formObjectId);
        if (!form) {
            console.error('updateFormAnalytics: Form not found', { formId: formObjectId });
            return;
        }
        
        // Get response statistics
        const stats = await FormResponse.aggregate([
            {
                $match: {
                    formId: formObjectId,
                    organizationId: orgObjectId
                }
            },
            {
                $group: {
                    _id: null,
                    totalResponses: { $sum: 1 },
                    avgCompliance: { $avg: '$kpis.compliancePercentage' },
                    avgRating: { $avg: '$kpis.rating' },
                    lastSubmission: { $max: '$submittedAt' }
                }
            }
        ]);
        
        if (stats.length > 0) {
            form.totalResponses = stats[0].totalResponses;
            form.avgCompliance = Math.round(stats[0].avgCompliance || 0);
            form.avgRating = Math.round((stats[0].avgRating || 0) * 10) / 10;
            form.lastSubmission = stats[0].lastSubmission;
            
            await form.save();
        }
    } catch (error) {
        console.error('Update form analytics error:', error);
    }
}

/**
 * Trigger workflows on submit
 */
async function triggerWorkflows(form, formResponse) {
    try {
        const workflow = form.workflowOnSubmit;
        if (!workflow) return;
        
        // Notify users
        if (workflow.notify && workflow.notify.length > 0) {
            // TODO: Implement notification service
            console.log('Notify users:', workflow.notify);
        }
        
        // Create task if configured
        if (workflow.createTask) {
            // Task creation will be handled separately
            console.log('Create task workflow triggered');
        }
        
        // Update field if configured
        if (workflow.updateField && workflow.updateField.field) {
            // Field update will be handled based on linkedTo
            console.log('Update field workflow triggered');
        }
    } catch (error) {
        console.error('Trigger workflows error:', error);
    }
}

/**
 * Create corrective task for failed questions
 */
async function createCorrectiveTask(form, formResponse, organizationId) {
    try {
        const failedQuestions = formResponse.responseDetails.filter(detail => detail.passFail === 'Fail');
        
        if (failedQuestions.length === 0) return;
        
        // Create task for corrective actions
        // Note: Task.relatedTo.type only supports: 'contact', 'deal', 'project', 'organization', 'none'
        // Events are not supported, so we set relatedTo to 'none' when linkedTo.type is 'Event'
        let relatedToType = 'none';
        let relatedToId = null;
        
        if (formResponse.linkedTo && formResponse.linkedTo.type && formResponse.linkedTo.type !== 'Event') {
            // Only set relatedTo if it's a supported type (not Event)
            const supportedTypes = ['contact', 'deal', 'project', 'organization'];
            if (supportedTypes.includes(formResponse.linkedTo.type.toLowerCase())) {
                relatedToType = formResponse.linkedTo.type.toLowerCase();
                relatedToId = formResponse.linkedTo.id;
            }
        }
        
        const taskData = {
            organizationId,
            title: `Corrective Actions Required: ${form.name}`,
            description: `Please address ${failedQuestions.length} failed question(s) from form submission ${formResponse.responseId}`,
            relatedTo: {
                type: relatedToType,
                id: relatedToId
            },
            assignedTo: form.assignedTo || formResponse.submittedBy,
            status: 'todo',
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        };
        
        // Create task (even if not linked to a supported module type)
        await Task.create(taskData);
    } catch (error) {
        console.error('Create corrective task error:', error);
    }
}

/**
 * Map form data to contact (for forms that create contacts)
 * 
 * ⚠️ IMPORTANT: Person creation is identity-only and app-agnostic.
 *    Participation fields (type, lead_status, etc.) are NOT set here.
 *    They must be set via Attach-to-App flow.
 */
exports.mapFormDataToContact = (form, responseDetails) => {
    const contactData = {
        // No participation fields - identity only
    };
    
    // Map common fields
    responseDetails.forEach(detail => {
        const question = findQuestionInForm(form, detail.questionId);
        if (!question) return;
        
        // Map email
        if (question.type === 'Text' && question.questionText.toLowerCase().includes('email')) {
            contactData.email = detail.answer;
        }
        
        // Map phone
        if (question.type === 'Text' && question.questionText.toLowerCase().includes('phone')) {
            contactData.phone = detail.answer;
        }
        
        // Map first name
        if (question.type === 'Text' && question.questionText.toLowerCase().includes('first name')) {
            contactData.first_name = detail.answer;
        }
        
        // Map last name
        if (question.type === 'Text' && question.questionText.toLowerCase().includes('last name')) {
            contactData.last_name = detail.answer;
        }
    });
    
    return contactData;
};

/**
 * Find question in form structure (checks both section-level and subsection-level questions)
 */
function findQuestionInForm(form, questionId) {
    if (!form.sections || !Array.isArray(form.sections)) {
        return null;
    }
    
    for (const section of form.sections) {
        // Check section-level questions first
        if (section.questions && Array.isArray(section.questions)) {
            for (const question of section.questions) {
                if (question.questionId === questionId) {
                    return question;
                }
            }
        }
        
        // Check subsection-level questions
        if (section.subsections && Array.isArray(section.subsections)) {
            for (const subsection of section.subsections) {
                if (subsection.questions && Array.isArray(subsection.questions)) {
                    for (const question of subsection.questions) {
                        if (question.questionId === questionId) {
                            return question;
                        }
                    }
                }
            }
        }
    }
    return null;
}

