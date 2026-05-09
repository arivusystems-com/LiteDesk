# ⚡ Quick Deploy Guide - Get Live in 30 Minutes

The fastest way to get Arivu CRM running on AWS for testing.

---

## 🎯 Overview

**What you'll get**:
- Live URL to share with friends
- Free MongoDB database
- Free EC2 server (1 year)
- Full CRM functionality

**Time**: 30-45 minutes  
**Cost**: $0 (using free tiers)

---

## 📋 Quick Steps

### 1️⃣ **Setup MongoDB (5 minutes)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up → Choose **FREE** tier
3. Create cluster (takes 3 mins)
4. Create user → Save password
5. Network Access → Allow `0.0.0.0/0`
6. Get connection string → Save it

✅ **You have**: `mongodb+srv://user:password@cluster.mongodb.net/...`

---

### 2️⃣ **Launch AWS Server (10 minutes)**

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. EC2 → Launch Instance
3. Settings:
   - Name: `arivu-server`
   - OS: Ubuntu 22.04
   - Type: t2.micro (FREE)
   - Create key pair → Download `.pem` file
   - Allow: SSH, HTTP, HTTPS
   - Storage: 30 GB
4. Launch → Wait 2 mins
5. Copy Public IP address

✅ **You have**: IP like `54.123.45.67` and `.pem` file

---

### 3️⃣ **Connect to Server (2 minutes)**

```bash
# Make key secure
chmod 400 ~/Downloads/arivu-key.pem

# Connect
ssh -i ~/Downloads/arivu-key.pem ubuntu@YOUR_EC2_IP
```

Type `yes` when prompted.

✅ **You're in**: See `ubuntu@ip-xxx:~$`

---

### 4️⃣ **Automated Deployment (15 minutes)**

**Option A: Use Deployment Script** (Recommended)

```bash
# Download deployment script
wget https://raw.githubusercontent.com/YOUR_USERNAME/Arivu/main/deploy-to-aws.sh

# Make executable
chmod +x deploy-to-aws.sh

# Run it
./deploy-to-aws.sh
```

Follow the prompts:
- MongoDB connection string
- EC2 IP address
- Press Enter for defaults

Script will:
- ✅ Install all dependencies
- ✅ Clone your code
- ✅ Build frontend
- ✅ Configure Nginx
- ✅ Start backend
- ✅ Run tests

---

**Option B: Manual Steps**

If script doesn't work, follow: [DEPLOYMENT_GUIDE_AWS.md](./DEPLOYMENT_GUIDE_AWS.md)

---

### 5️⃣ **Test It! (2 minutes)**

1. Open browser: `http://YOUR_EC2_IP`
2. You should see login page
3. Login:
   - Email: `admin@arivu.com`
   - Password: `Admin@123456`
4. You're in! 🎉

---

### 6️⃣ **Share with Friends (1 minute)**

Send them:
```
🚀 Arivu CRM Testing

URL: http://YOUR_EC2_IP

Test Accounts:
- Admin: admin@arivu.com / Admin@123456

Try:
✅ Create contacts
✅ Manage deals
✅ Create tasks
✅ Import CSV data
✅ Test different user roles

Feedback welcome!
```

---

## 🚨 Troubleshooting (5 minutes)

### Can't see website?

```bash
# Check if services are running
pm2 status
sudo systemctl status nginx

# Check logs
pm2 logs arivu-api
sudo tail -f /var/log/nginx/error.log
```

### Backend not starting?

```bash
# Check MongoDB connection
cd /home/ubuntu/Arivu/server
cat .env  # Verify MONGODB_URI is correct

# Restart
pm2 restart arivu-api
pm2 logs arivu-api
```

### Frontend shows blank page?

```bash
# Rebuild
cd /home/ubuntu/Arivu/client
npm run build
sudo systemctl restart nginx
```

---

## 🎯 Next Steps

After it's working:

1. **Change admin password** (Settings → User Management)
2. **Create test users** with different roles
3. **Import sample data** (CSV import)
4. **Test permissions** (Manager vs User vs Viewer)
5. **Collect feedback** from friends
6. **Monitor logs**: `pm2 logs arivu-api`

---

## 💰 Cost Tracking

| Item | Status | Cost |
|------|--------|------|
| MongoDB Atlas | Free forever | $0 |
| EC2 t2.micro | Free 1 year | $0 |
| After 1 year | Pay-as-you-go | ~$10/mo |

**Total for first year**: **$0** 🎉

---

## 🔒 (Optional) Add Domain & HTTPS

Have a domain? Add SSL in 5 minutes:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Update backend .env
cd /home/ubuntu/Arivu/server
nano .env
# Change CLIENT_URL to https://yourdomain.com

# Restart
pm2 restart arivu-api
```

Now access via: `https://yourdomain.com` ✅

---

## 📚 Full Documentation

Need more details? Check:

- **[DEPLOYMENT_GUIDE_AWS.md](./DEPLOYMENT_GUIDE_AWS.md)** - Complete step-by-step guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Detailed checklist
- **[deploy-to-aws.sh](./deploy-to-aws.sh)** - Automated script

---

## 🎉 That's It!

Your CRM is live in 30 minutes:

✅ Database running  
✅ Server configured  
✅ Application deployed  
✅ Ready for testing  
✅ Shareable URL  

**Share with friends and start collecting feedback!** 🚀

---

## 🆘 Need Help?

**Common Issues**:

| Problem | Solution |
|---------|----------|
| Can't SSH | Check security group allows your IP on port 22 |
| "Connection refused" | Backend not started: `pm2 start server.js` |
| "502 Bad Gateway" | Backend crashed: `pm2 logs arivu-api` |
| CORS errors | Update CORS_ORIGINS in server/.env |
| Blank page | Rebuild frontend: `cd client && npm run build` |

**Check logs**:
```bash
pm2 logs arivu-api --lines 50
sudo tail -f /var/log/nginx/error.log
```

**Still stuck?** See [DEPLOYMENT_GUIDE_AWS.md](./DEPLOYMENT_GUIDE_AWS.md) Section 9: Troubleshooting

---

**Happy Deploying! 🚀**

