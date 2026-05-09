# 🔧 Environment Configuration Guide

## ✨ Worry-Free Local & Production Setup

Your `.env` file now works for **BOTH** local development and production deployment automatically!

---

## 🎯 How It Works

### Smart Environment Detection

The server automatically detects which environment it's running in based on `NODE_ENV`:

```javascript
// In server.js
const isProduction = process.env.NODE_ENV === 'production';

// Automatically uses correct MongoDB:
const MONGO_URI = isProduction 
  ? process.env.MONGO_URI_PRODUCTION  // MongoDB Atlas for production
  : process.env.MONGO_URI_LOCAL;      // localhost for development
```

---

## 📋 Configuration Overview

### Your `.env` File Structure

```env
# Environment mode (changes automatically)
NODE_ENV=development  # or 'production'

# Local MongoDB
MONGO_URI_LOCAL=mongodb://localhost:27017/arivu

# Production MongoDB Atlas
MONGO_URI_PRODUCTION=mongodb+srv://arivuadmin:...

# Active MongoDB (set automatically)
MONGO_URI=mongodb://localhost:27017/arivu
```

---

## 💻 For Local Development

### What You Do:
**NOTHING!** Just run your app:

```bash
cd server
npm start
```

### What Happens Automatically:
- ✅ `NODE_ENV` = `development`
- ✅ Uses `MONGO_URI_LOCAL` (localhost)
- ✅ Frontend URL = `http://localhost:5173`
- ✅ CORS allows localhost origins
- ✅ Port = 5000

### Console Output:
```
🚀 Starting Arivu CRM in DEVELOPMENT mode
📊 Port: 5000
🗄️  Database: mongodb://localhost:27017...
✅ MongoDB connected successfully
📊 Database: Local MongoDB
```

---

## 🚀 For Production Deployment

### What You Do:
**NOTHING!** Just run the deployment script:

```bash
./deploy-local-build.sh
```

### What Happens Automatically:
- ✅ Deployment script updates `.env` for production
- ✅ Sets `NODE_ENV` = `production`
- ✅ Updates `MONGO_URI` = `MONGO_URI_PRODUCTION`
- ✅ Updates `CLIENT_URL` = `http://13.203.208.47`
- ✅ Updates `CORS_ORIGINS` for production
- ✅ Uploads `.env` to EC2
- ✅ Backend reads production settings

### Console Output on EC2:
```
🚀 Starting Arivu CRM in PRODUCTION mode
📊 Port: 5000
🗄️  Database: mongodb+srv://arivuadmin...
✅ MongoDB connected successfully
📊 Database: MongoDB Atlas
```

---

## 🔄 Switching Between Environments

### You Don't Need To!

The system handles everything automatically:

| Action | Environment | MongoDB | Frontend URL |
|--------|-------------|---------|--------------|
| `npm start` locally | development | localhost | localhost:5173 |
| Deploy to EC2 | production | Atlas | 13.203.208.47 |

---

## 📝 Environment Variables Explained

### Database
```env
MONGO_URI_LOCAL       # Local MongoDB (development)
MONGO_URI_PRODUCTION  # MongoDB Atlas (production)
MONGO_URI             # Active URI (set automatically)
MONGODB_URI           # Alias for compatibility
```

### URLs
```env
CLIENT_URL            # Frontend URL (auto-switched)
CORS_ORIGINS          # Allowed origins (auto-switched)
```

### Security
```env
JWT_SECRET            # Same for both (consistency)
REFRESH_TOKEN_SECRET  # Same for both
MASTER_API_KEY        # Generated during deployment
```

---

## 🛠️ Manual Environment Switching

If you ever need to manually switch:

### Switch to Production Mode Locally

```bash
# In server/.env, change:
NODE_ENV=production

# Server will automatically use:
# - MONGO_URI_PRODUCTION (Atlas)
# - Production URLs
```

### Switch Back to Development

```bash
# In server/.env, change:
NODE_ENV=development

# Server will automatically use:
# - MONGO_URI_LOCAL (localhost)
# - Development URLs
```

---

## 🔍 Debugging Environment Issues

### Check Current Environment

When server starts, it shows:

```
🚀 Starting Arivu CRM in DEVELOPMENT mode  ← Shows current mode
📊 Port: 5000
🗄️  Database: mongodb://localhost...           ← Shows which DB
🌐 Allowed Origins: http://localhost:5173     ← Shows CORS config
```

### Check MongoDB Connection

```bash
# The server now shows detailed MongoDB info:
✅ MongoDB connected successfully
📊 Database: Local MongoDB  # or "MongoDB Atlas"
```

### Common Issues

**Issue: "MONGO_URI is not defined"**
```
❌ FATAL ERROR: MONGO_URI is not defined!
```

**Fix:**
```bash
# Check your .env file has:
MONGO_URI=mongodb://localhost:27017/arivu
# Or:
MONGO_URI_LOCAL=mongodb://localhost:27017/arivu
```

**Issue: "Cannot connect to MongoDB"**
```
❌ DATABASE CONNECTION FAILED!
```

**Fix for Development:**
```bash
# Make sure MongoDB is running:
brew services start mongodb-community
# Or:
mongod
```

**Fix for Production:**
- Check MongoDB Atlas is accessible
- Verify connection string
- Check network access settings in Atlas

---

## 🎯 Best Practices

### 1. Never Manually Edit Production Variables

Let the deployment script handle production settings:
```bash
✅ DO: ./deploy-local-build.sh
❌ DON'T: Manually edit .env for production
```

### 2. Keep Secrets Secure

Never commit secrets to git:
```bash
# .env is in .gitignore
# Safe to keep locally
```

### 3. Test Locally Before Deploying

```bash
# Always test locally first:
cd server
npm start

# Then deploy:
cd ..
./deploy-local-build.sh
```

---

## 📊 Environment Checklist

### Development (Your Mac)
- [ ] `NODE_ENV=development` in `.env`
- [ ] MongoDB running locally
- [ ] `MONGO_URI_LOCAL` points to localhost
- [ ] Frontend running on `localhost:5173`
- [ ] Can create contacts/deals/tasks

### Production (EC2)
- [ ] Deployment script completed
- [ ] `NODE_ENV=production` on server
- [ ] `MONGO_URI` points to Atlas
- [ ] Can access via `http://13.203.208.47`
- [ ] Can login successfully

---

## 🚀 Quick Reference

### Local Development
```bash
cd server
npm start  # That's it!
```

### Deploy to Production
```bash
./deploy-local-build.sh  # That's it!
```

### Check Environment
```bash
# Server logs show on startup:
# - Current mode (development/production)
# - Database being used
# - Port and URLs
```

---

## 💡 Pro Tips

### 1. Multiple Environment Files

You can create multiple .env files:
```
.env                # Default (development)
.env.development    # Development specific
.env.production     # Production specific
.env.test           # Testing
```

### 2. Environment-Specific Features

```env
# In .env
ENABLE_DEBUG_LOGS=true  # Only in development

# In code:
if (!isProduction) {
  console.log('Debug info...');
}
```

### 3. Quick Environment Switch

```bash
# Test production mode locally:
NODE_ENV=production npm start

# Back to development:
npm start
```

---

## 🎉 Summary

### What's Automatic Now:

✅ **MongoDB Selection**: Local vs Atlas  
✅ **URL Configuration**: Development vs Production  
✅ **CORS Settings**: Correct origins  
✅ **Environment Detection**: No manual switching  
✅ **Deployment Updates**: Script handles everything  

### What You Do:

✅ **For Development**: `npm start`  
✅ **For Production**: `./deploy-local-build.sh`  
✅ **Nothing Else!**: System is worry-free  

---

## 📞 Need Help?

Check server logs on startup - they show:
- Which environment mode is active
- Which database is being used
- What URLs are configured
- If there are any connection issues

**Example healthy startup:**
```
🚀 Starting Arivu CRM in DEVELOPMENT mode
📊 Port: 5000
🗄️  Database: mongodb://localhost:27017...
✅ MongoDB connected successfully
╔════════════════════════════════════════╗
║  ✅ Arivu CRM Server Running!      ║
╚════════════════════════════════════════╝
```

**You're all set! Develop locally, deploy with confidence!** 🚀

