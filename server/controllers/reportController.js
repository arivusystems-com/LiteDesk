const Report = require('../models/Report');
const mongoose = require('mongoose');

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            organizationId: req.user.organizationId,
            createdBy: req.user._id
        };

        const newReport = await Report.create(payload);
        
        const report = await Report.findById(newReport._id)
            .populate('createdBy', 'firstName lastName email')
            .populate('sharedWith', 'firstName lastName email');
        
        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error creating report.', 
            error: error.message 
        });
    }
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res) => {
    try {
        const query = { organizationId: req.user.organizationId };
        
        // Filter by user if needed
        if (req.filterByUser) {
            query.createdBy = req.filterByUser;
        }
        
        // Get pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000; // Default to 1000 for lookup
        const skip = (page - 1) * limit;
        
        // Get filters
        if (req.query.reportType) {
            query.reportType = req.query.reportType;
        }
        if (req.query.entity) {
            query.entity = req.query.entity;
        }
        if (req.query.createdBy) {
            query.createdBy = req.query.createdBy;
        }
        
        // Search functionality
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { name: searchRegex },
                { description: searchRegex }
            ];
        }
        
        // Build query
        const reportsQuery = Report.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('sharedWith', 'firstName lastName email')
            .sort({ createdAt: -1 });
        
        // Execute query with pagination
        const reports = await reportsQuery.skip(skip).limit(limit);
        const total = await Report.countDocuments(query);
        
        res.json({
            success: true,
            data: reports,
            meta: {
                page,
                perPage: limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching reports.', 
            error: error.message 
        });
    }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        })
        .populate('createdBy', 'firstName lastName email')
        .populate('sharedWith', 'firstName lastName email');
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found.'
            });
        }
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get report by ID error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching report.', 
            error: error.message 
        });
    }
};

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found.'
            });
        }
        
        // Update fields
        Object.assign(report, req.body);
        report.updatedAt = new Date();
        
        await report.save();
        
        const updatedReport = await Report.findById(report._id)
            .populate('createdBy', 'firstName lastName email')
            .populate('sharedWith', 'firstName lastName email');
        
        res.json({
            success: true,
            data: updatedReport
        });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(400).json({ 
            success: false,
            message: 'Error updating report.', 
            error: error.message 
        });
    }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found.'
            });
        }
        
        await Report.deleteOne({ _id: report._id });
        
        res.json({
            success: true,
            message: 'Report deleted successfully.'
        });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error deleting report.', 
            error: error.message 
        });
    }
};

// @desc    Execute report
// @route   POST /api/reports/:id/run
// @access  Private
exports.runReport = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found.'
            });
        }
        
        // TODO: Implement actual report execution logic
        // This would query the appropriate entity collection based on report.entity
        // and apply filters, grouping, and aggregations
        
        res.json({
            success: true,
            message: 'Report execution not yet implemented.',
            data: {
                reportId: report._id,
                reportName: report.name
            }
        });
    } catch (error) {
        console.error('Run report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error running report.', 
            error: error.message 
        });
    }
};

// @desc    Export report
// @route   POST /api/reports/:id/export
// @access  Private
exports.exportReport = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found.'
            });
        }
        
        // TODO: Implement actual report export logic
        // This would generate CSV, Excel, or PDF based on report configuration
        
        res.json({
            success: true,
            message: 'Report export not yet implemented.',
            data: {
                reportId: report._id,
                reportName: report.name
            }
        });
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error exporting report.', 
            error: error.message 
        });
    }
};

