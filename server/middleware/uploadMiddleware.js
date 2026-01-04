const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists (best-effort; fall back to per-request creation)
const uploadsDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('[uploadMiddleware] Failed to create base uploads dir:', uploadsDir, err);
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create organization-specific folder
    const rawOrgId = req.user?.organizationId?.toString() || 'public';
    // Sanitize folder name to prevent path traversal / invalid characters
    const safeOrgId = String(rawOrgId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const orgDir = path.join(uploadsDir, safeOrgId);

    try {
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }
      cb(null, orgDir);
    } catch (err) {
      console.error('[uploadMiddleware] Failed to create org upload dir:', { rawOrgId, safeOrgId, orgDir, err });
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and common document types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images, PDF, Word, Excel, CSV`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware for single file upload
exports.uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

// Middleware for multiple file uploads
exports.uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  // Wrap multer so errors return JSON (instead of Express default HTML error page)
  const mw = upload.array(fieldName, maxCount);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next();

      const message =
        err.message ||
        (err.code ? `Upload error (${err.code})` : 'Upload failed');

      // Multer errors are typically client errors
      const status = err.name === 'MulterError' ? 400 : 500;

      return res.status(status).json({
        success: false,
        message: 'File upload failed.',
        error: message
      });
    });
  };
};

// Middleware for multiple fields
exports.uploadFields = (fields) => {
  return upload.fields(fields);
};

// Helper to get file URL
exports.getFileUrl = (req, filename) => {
  const orgId = req.user?.organizationId?.toString() || 'public';
  return `/api/uploads/${orgId}/${filename}`;
};

// Helper to get file path
exports.getFilePath = (filename, orgId = null) => {
  const org = orgId || 'public';
  return path.join(uploadsDir, org, filename);
};

