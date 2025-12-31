const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle, getFileUrl } = require('../middleware/uploadMiddleware');

const router = express.Router();

// @desc    Upload a file (image, document, etc.)
// @route   POST /api/upload
// @access  Private
router.post('/', protect, uploadSingle('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const fileUrl = getFileUrl(req, req.file.filename);

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message
        });
    }
});

module.exports = router;

