# 🧪 Local Testing Guide

This guide will walk you through testing the Arivu multi-instance CRM locally.

---

## 🎯 What We'll Test

1. ✅ **Basic CRM Functionality** - Registration, login, organization setup
2. ✅ **Demo Request System** - Submit and manage demo requests
3. ✅ **Instance Provisioning** - Convert demo to organization (simulated)
4. ✅ **Instance Dashboard** - View and manage instances
5. ✅ **Health Monitoring** - Automated health checks
6. ✅ **Metrics Collection** - Usage tracking

---

## 🚀 Step 1: Start Docker Desktop

**macOS:**
1. Open **Docker Desktop** from Applications
2. Wait for the whale icon in menu bar to stabilize
3. Verify: Click the whale icon → Should say "Docker Desktop is running"

---

## 📦 Step 2: Start All Services

### Option A: Using Docker Compose (Recommended)

```bash
# From project root
cd /Users/Prabhu/Documents/GitHub/Arivu

# Start all services (MongoDB, Backend, Frontend, Redis)
docker-compose up -d

# Check if all services are running
docker-compose ps

# View logs (optional)
docker-compose logs -f
```

**Expected output:**
```
✅ arivu-mongo    - Up
✅ arivu-backend  - Up
✅ arivu-frontend - Up
✅ arivu-redis    - Up
```

### Option B: Manual Start (Backend only)

```bash
# Terminal 1: Start MongoDB
docker run -d --name arivu-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:6.0

# Terminal 2: Start Backend
cd server
npm start

# Terminal 3: Start Frontend
cd client
npm run dev
```

---

## 🔍 Step 3: Verify Services

### Check Backend Health
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T...",
  "service": "Arivu Master Control Plane",
  "database": {
    "connected": true,
    "state": "connected"
  }
}
```

### Check System Status
```bash
curl http://localhost:3000/health/status
```

### Access Frontend
Open browser: **http://localhost:5173**

You should see the Arivu landing page! 🎉

---

## 👤 Step 4: Create Your First Account

1. **Navigate to:** http://localhost:5173
2. **Click "Register"** (or it may be on the landing page)
3. **Fill in the form:**
   - **Email:** admin@test.com
   - **Password:** Test123!
   - **Organization Name:** Test Company
   - **Industry:** Technology
4. **Click "Register"**

**What happens:**
- ✅ Organization is created
- ✅ You become the Owner with full permissions
- ✅ JWT token is issued
- ✅ Redirected to Dashboard

---

## 📋 Step 5: Submit a Demo Request

1. **Logout** (or open incognito window)
2. **Go to landing page:** http://localhost:5173
3. **Fill out "Request Demo" form:**
   - Company Name: Acme Corp
   - Industry: Retail
   - Company Size: 50-200
   - Contact Name: John Doe
   - Email: john@acmecorp.com
   - Phone: +1234567890
   - Job Title: CEO
   - Message: Interested in your CRM solution
4. **Submit**

**What happens:**
- ✅ Demo request is saved to database
- ✅ Status set to "pending"
- ✅ Assignable to sales team (you)

---

## 🎯 Step 6: Convert Demo to Organization

1. **Login** as admin@test.com
2. **Navigate to:** Demo Requests (in navigation)
3. **Find your demo request** (Acme Corp)
4. **Click "View Details"**
5. **Click "Convert to Organization"**

**What happens:**
- ✅ Instance provisioning starts (background process)
- ✅ InstanceRegistry entry created
- ✅ Status updates from "provisioning" → "active"
- ✅ Email would be sent (if configured)

**Note:** In local development without Kubernetes, the actual deployment won't happen, but you'll see the database records and workflow!

---

## 📊 Step 7: View Instance Dashboard

1. **Navigate to:** Instances (in navigation)
2. **You should see:**
   - Statistics cards (Total, Active, Provisioning, MRR)
   - Instance table with Acme Corp
   - Status: "provisioning" or "active" (simulated)
   - Health status, subscription tier, metrics

3. **Click "View Details"** on an instance
   - See complete instance information
   - Database connection details
   - URLs, metrics, subscription

---

## 🏥 Step 8: Monitor Health Checks

The health checker runs automatically every 5 minutes when the server starts!

**Check the backend logs:**
```bash
# If using docker-compose
docker-compose logs -f backend

# If running manually
# Check terminal where npm start is running
```

**You should see:**
```
🏥 Starting health checker service...
✅ Health checker started (interval: 300s)
🔍 Running health checks on all active instances...
```

---

## 📈 Step 9: Test API Endpoints

### 1. Get All Instances
```bash
# Get auth token first (from browser DevTools → localStorage → user)
TOKEN="your-jwt-token-here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/instances
```

### 2. Get Instance Analytics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/instances/analytics
```

### 3. Get Aggregated Metrics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/metrics/aggregated
```

### 4. Get Demo Requests
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/demo
```

---

## 🧪 Step 10: Test Database

### Connect to MongoDB
```bash
# Using Docker exec
docker exec -it arivu-mongo mongosh \
  -u admin -p password123 --authenticationDatabase admin

# Or using MongoDB Compass
# Connection string: mongodb://admin:password123@localhost:27017/
```

### Check Collections
```javascript
// In mongosh
use arivu

// See all collections
show collections

// View organizations
db.organizations.find().pretty()

// View users
db.users.find().pretty()

// View demo requests
db.demorequests.find().pretty()

// View instance registry
db.instanceregistries.find().pretty()
```

---

## ✅ Testing Checklist

**Basic Functionality:**
- [ ] Register new account (creates organization)
- [ ] Login with credentials
- [ ] Dashboard loads correctly
- [ ] Navigation works

**Demo System:**
- [ ] Submit demo request from landing page
- [ ] View demo requests in admin dashboard
- [ ] Update demo status
- [ ] Convert demo to organization

**Instance Management:**
- [ ] View instances dashboard
- [ ] See statistics cards
- [ ] Filter instances by status
- [ ] Search instances
- [ ] View instance details

**Monitoring:**
- [ ] Health endpoint returns 200
- [ ] Status endpoint shows statistics
- [ ] Health checker logs appear
- [ ] Metrics collector logs appear

**Database:**
- [ ] MongoDB connection successful
- [ ] Collections created
- [ ] Data persists after restart

---

## 🐛 Troubleshooting

### Issue: Backend won't start

**Error:** `ECONNREFUSED` or `MongoDB connection error`

**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### Issue: Frontend can't reach backend

**Error:** `Network Error` or `404`

**Solution:**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check vite.config.js proxy settings
# Should proxy /api to http://localhost:3000
```

### Issue: Port already in use

**Error:** `EADDRINUSE: port 3000 already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Issue: "Cannot read properties of undefined"

**Solution:**
```bash
# Clear browser cache and localStorage
# In DevTools → Application → Clear storage

# Restart backend
docker-compose restart backend
```

---

## 🎯 What to Expect in Local Mode

### ✅ Working Features:
- Registration & Login
- Organization management
- Demo request submission
- Demo conversion workflow
- Instance registry database
- Health checks (API endpoint level)
- Metrics collection (simulated data)
- Full UI/UX
- API endpoints
- Database operations

### ⚠️ Simulated Features (No Kubernetes locally):
- Actual Kubernetes deployment
- Real customer instance provisioning
- DNS record creation
- SSL certificate generation
- Subdomain routing

**Note:** The provisioning workflow will run and create database records, but won't actually deploy containers. This is perfect for testing the business logic and UI!

---

## 🚀 Next Steps After Local Testing

Once everything works locally:

1. **Deploy to AWS** - Follow `DEPLOYMENT_GUIDE.md`
2. **Configure Kubernetes** - Set up EKS cluster
3. **Test Real Provisioning** - Convert demo with actual K8s
4. **Set up Monitoring** - CloudWatch, alerts
5. **Add Email** - Welcome emails, trial reminders
6. **Integrate Stripe** - Payment processing

---

## 📞 Need Help?

**Check logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb
```

**Reset everything:**
```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

**Happy Testing! 🎉**

