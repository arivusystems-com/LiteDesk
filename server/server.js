// server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Environment-aware configuration
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

// Smart MongoDB URI selection (handles both MONGO_URI and MONGODB_URI)
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 
                  (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL);

const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI ? MONGO_URI.split('?') : [null, null];
const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';

// Smart CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : (isProduction 
      ? ['http://13.203.208.47', 'https://13.203.208.47']
      : ['http://localhost:5173', 'http://localhost:3000']);

console.log(`🚀 Starting LiteDesk CRM in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`📊 Port: ${PORT}`);
console.log(`🗄️  Database: ${MONGO_URI ? MONGO_URI.substring(0, 30) + '...' : 'NOT SET'}`);
console.log(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`);

// 🚨 CRUCIAL: Configure Express to serve static files (like your CSS)
// Assuming your final CSS is in a folder named 'public'
// app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// SECURITY MIDDLEWARE (Applied First)
// ============================================

// 🔓 SECURITY DISABLED FOR DEVELOPMENT
// Set DISABLE_SECURITY=true in .env to bypass all security checks
const SECURITY_DISABLED = process.env.DISABLE_SECURITY === 'true' || process.env.NODE_ENV !== 'production';

// Security Headers - Apply to all responses (skip if security disabled)
if (!SECURITY_DISABLED) {
    const securityHeaders = require('./middleware/securityHeadersMiddleware');
    app.use(securityHeaders);
} else {
    console.warn('⚠️  [DEV] Security headers middleware disabled');
}

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parsing
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General API Rate Limiting (skip if security disabled)
if (!SECURITY_DISABLED) {
    const { apiLimiter } = require('./middleware/rateLimitMiddleware');
    app.use('/api', apiLimiter);
} else {
    console.warn('⚠️  [DEV] API rate limiting disabled');
}

// CSRF Protection (for state-changing operations)
// DISABLED in development for API testing
const csrfProtection = require('./middleware/csrfMiddleware');
if (process.env.NODE_ENV === 'production') {
    app.use(csrfProtection);
}

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const dealRoutes = require('./routes/dealRoutes');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');
const csvRoutes = require('./routes/csvRoutes');
const demoRoutes = require('./routes/demoRoutes');
const instanceRoutes = require('./routes/instanceRoutes');
const healthRoutes = require('./routes/healthRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userPreferencesRoutes = require('./routes/userPreferencesRoutes');
const peopleRoutes = require('./routes/peopleRoutes');
const organizationV2Routes = require('./routes/organizationV2Routes');
const moduleRoutes = require('./routes/moduleRoutes');
const groupRoutes = require('./routes/groupRoutes');
const formRoutes = require('./routes/formRoutes');
const reportRoutes = require('./routes/reportRoutes');
const itemRoutes = require('./routes/itemRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Route Linking
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/imports', require('./routes/importHistoryRoutes'));
app.use('/api/demo', demoRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/admin', adminRoutes); // Admin-only cross-organization endpoints
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/health', healthRoutes); // Public health check endpoint
// New versioned endpoints (non-breaking)
app.use('/api/people', peopleRoutes);
app.use('/api/v2/organization', organizationV2Routes);
app.use('/api/modules', moduleRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/public/forms', formRoutes); // Public form routes
app.use('/api/forms', formRoutes.protected); // Protected form routes
app.use('/api/reports', reportRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files (including reports)
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        // Set appropriate content type for PDFs
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
        // Set appropriate content type for Excel files
        if (filePath.endsWith('.xlsx')) {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        }
    }
}));

// 1. Database Connection
console.log('🔄 Connecting to MongoDB...');

// Feature flags (defaults can be overridden via environment)
process.env.FEATURE_READ_THROUGH_PEOPLE = typeof process.env.FEATURE_READ_THROUGH_PEOPLE === 'undefined' ? 'true' : process.env.FEATURE_READ_THROUGH_PEOPLE;
process.env.FEATURE_CONTACTS_USE_PEOPLE = typeof process.env.FEATURE_CONTACTS_USE_PEOPLE === 'undefined' ? 'true' : process.env.FEATURE_CONTACTS_USE_PEOPLE;
process.env.FEATURE_READ_THROUGH_ORG = typeof process.env.FEATURE_READ_THROUGH_ORG === 'undefined' ? 'true' : process.env.FEATURE_READ_THROUGH_ORG;
process.env.FEATURE_ORG_USE_V2 = typeof process.env.FEATURE_ORG_USE_V2 === 'undefined' ? 'true' : process.env.FEATURE_ORG_USE_V2;
process.env.FEATURE_DUAL_WRITE_PEOPLE = typeof process.env.FEATURE_DUAL_WRITE_PEOPLE === 'undefined' ? 'false' : process.env.FEATURE_DUAL_WRITE_PEOPLE;
process.env.FEATURE_DUAL_WRITE_ORG = typeof process.env.FEATURE_DUAL_WRITE_ORG === 'undefined' ? 'false' : process.env.FEATURE_DUAL_WRITE_ORG;

console.log('🧪 Feature Flags:', {
  FEATURE_READ_THROUGH_PEOPLE: process.env.FEATURE_READ_THROUGH_PEOPLE,
  FEATURE_CONTACTS_USE_PEOPLE: process.env.FEATURE_CONTACTS_USE_PEOPLE,
  FEATURE_READ_THROUGH_ORG: process.env.FEATURE_READ_THROUGH_ORG,
  FEATURE_ORG_USE_V2: process.env.FEATURE_ORG_USE_V2,
  FEATURE_DUAL_WRITE_PEOPLE: process.env.FEATURE_DUAL_WRITE_PEOPLE,
  FEATURE_DUAL_WRITE_ORG: process.env.FEATURE_DUAL_WRITE_ORG
});

if (!MONGO_URI || !mongoUriWithoutQuery) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined in environment variables!');
  console.error('📝 Please check your .env file and ensure MONGO_URI or MONGODB_URI is set.');
  console.error(`   Expected for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  process.exit(1);
}

// Connect to master database (for Organizations, Users, DemoRequests)
const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
const masterDbName = 'litedesk_master';
const masterUri = `${baseUri}/${masterDbName}${mongoQueryString}`;

mongoose.connect(masterUri)
  .then(async () => {
    console.log('✅ Master database connected successfully.');
    console.log(`📊 Database: ${masterDbName}`);
    console.log(`📊 Connection: ${MONGO_URI.includes('localhost') ? 'Local MongoDB' : 'MongoDB Atlas'}`);
    
    // Initialize database connection manager
    const dbConnectionManager = require('./utils/databaseConnectionManager');
    // Set base URI for organization database connections
    dbConnectionManager.baseMongoUri = baseUri;
    dbConnectionManager.connectionQuery = mongoQueryString;
    await dbConnectionManager.initializeMasterConnection();
    console.log('✅ Database connection manager initialized');
    
    // 2. Start Monitoring Services (if enabled)
    if (process.env.ENABLE_HEALTH_CHECKER !== 'false') {
      const healthChecker = require('./services/monitoring/healthChecker');
      healthChecker.start();
      console.log('✅ Health checker started');
    }
    
    if (process.env.ENABLE_METRICS_COLLECTOR !== 'false') {
      const metricsCollector = require('./services/monitoring/metricsCollector');
      metricsCollector.start();
      console.log('✅ Metrics collector started');
    }
    
    // 3. Start Server after successful DB connection
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log(`║  ✅ LiteDesk CRM Server Running Successfully!        ║`);
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`🔧 Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════╗');
    console.error('║  ❌ DATABASE CONNECTION FAILED!                       ║');
    console.error('╚════════════════════════════════════════════════════════╝');
    console.error('🔍 Error Details:', err.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check if MongoDB is running (local) or accessible (Atlas)');
    console.error('   2. Verify MONGO_URI in .env file');
    console.error('   3. Check network connectivity for MongoDB Atlas');
    console.error('   4. Verify database credentials');
    console.error('');
    process.exit(1);
  });

// 3. Basic Test Route
app.get('/', (req, res) => {
  res.send('CRM API is operational.');
});