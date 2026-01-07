/**
 * ============================================================================
 * File Storage Service (Abstraction Layer)
 * ============================================================================
 * 
 * Provides a unified interface for file storage operations.
 * Currently supports local storage (dev), with future support for S3/GCS.
 * 
 * Usage:
 *   const fileStorage = require('./services/fileStorageService');
 *   const result = await fileStorage.uploadFile(file, { organizationId, userId });
 * 
 * ============================================================================
 */

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/evidence');
const MAX_FILE_SIZE = parseInt(process.env.MAX_EVIDENCE_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain',
    'text/csv'
];

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Validate file before upload
 */
function validateFile(file) {
    if (!file) {
        throw new Error('File is required');
    }
    
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
    }
    
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed`);
    }
}

/**
 * Generate unique filename
 */
function generateFileName(originalName, mimeType) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${sanitizedBaseName}_${timestamp}_${uniqueId}${ext}`;
}

/**
 * Upload file to storage
 * 
 * @param {Object} file - Multer file object
 * @param {Object} context - Context information (organizationId, userId, etc.)
 * @returns {Promise<Object>} - { fileUrl, fileName, fileSize, mimeType }
 */
async function uploadFile(file, context = {}) {
    try {
        // Validate file
        validateFile(file);
        
        // Ensure upload directory exists
        await ensureUploadDir();
        
        // Generate unique filename
        const fileName = generateFileName(file.originalname, file.mimetype);
        
        // Create organization-specific subdirectory
        const orgDir = context.organizationId 
            ? path.join(UPLOAD_DIR, context.organizationId.toString())
            : UPLOAD_DIR;
        await fs.mkdir(orgDir, { recursive: true });
        
        // Full file path
        const filePath = path.join(orgDir, fileName);
        
        // Write file to disk
        await fs.writeFile(filePath, file.buffer);
        
        // Generate file URL (relative to uploads directory)
        const relativePath = context.organizationId
            ? `evidence/${context.organizationId}/${fileName}`
            : `evidence/${fileName}`;
        const fileUrl = `/api/uploads/${relativePath}`;
        
        return {
            fileUrl,
            fileName: file.originalname, // Keep original name for display
            storedFileName: fileName, // Actual stored filename
            fileSize: file.size,
            mimeType: file.mimetype
        };
    } catch (error) {
        console.error('File upload error:', error);
        throw error;
    }
}

/**
 * Future: Upload to S3
 * TODO: Implement when S3 support is needed
 */
async function uploadToS3(file, context) {
    // Placeholder for future S3 implementation
    throw new Error('S3 upload not yet implemented');
}

/**
 * Future: Upload to GCS
 * TODO: Implement when GCS support is needed
 */
async function uploadToGCS(file, context) {
    // Placeholder for future GCS implementation
    throw new Error('GCS upload not yet implemented');
}

module.exports = {
    uploadFile,
    validateFile,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES
};

