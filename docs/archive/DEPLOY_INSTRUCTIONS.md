# 🚀 Deploy Your Arivu CRM to AWS - READY TO GO!

## ✅ Everything is Pre-Configured!

Your deployment scripts are ready with:
- ✅ **EC2 IP:** 43.204.144.169
- ✅ **MongoDB Atlas:** Connected and configured
- ✅ **GitHub Repo:** https://github.com/Prabhubalu/Arivu.git
- ✅ **Auto-generated secrets:** JWT tokens will be created automatically
- ✅ **One-click deployment:** Fully automated!

---

## 🎯 Choose Your Deployment Method

### **Method 1: Super Easy - Deploy from Your Mac (RECOMMENDED)** ⭐

This is the easiest way! Just run one command from your Mac.

**Step 1:** First, push your code to GitHub:
```bash
cd /Users/Prabhu/Documents/GitHub/Arivu
git push origin main
# (Enter your GitHub credentials if asked)
```

**Step 2:** Run the deployment script:
```bash
./deploy-from-local.sh
```

That's it! The script will:
- Ask for your SSH key path (e.g., `~/Downloads/arivu-key.pem`)
- Connect to your EC2 instance
- Upload the deployment script
- Run the full deployment
- Tell you when it's done!

**Time:** 5-10 minutes total

---

### **Method 2: Deploy Directly on EC2**

If you prefer to work directly on the server:

**Step 1:** Push your code to GitHub:
```bash
cd /Users/Prabhu/Documents/GitHub/Arivu
git push origin main
```

**Step 2:** SSH into your EC2 instance:
```bash
# Make your key file secure first
chmod 400 ~/path/to/your-key.pem

# Connect to EC2
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169
```

**Step 3:** Clone and deploy:
```bash
# Clone your repository
git clone https://github.com/Prabhubalu/Arivu.git
cd Arivu

# Run the deployment script
chmod +x deploy-aws-quick.sh
./deploy-aws-quick.sh
```

**Time:** 5-10 minutes

---

## 📋 Prerequisites Checklist

Before deploying, make sure you have:

- [ ] EC2 instance running at **43.204.144.169**
- [ ] EC2 instance is **Ubuntu 22.04 LTS**
- [ ] SSH key file (`.pem`) downloaded
- [ ] Security Group allows:
  - SSH (port 22) from your IP
  - HTTP (port 80) from anywhere (0.0.0.0/0)
  - HTTPS (port 443) from anywhere (0.0.0.0/0)
- [ ] MongoDB Atlas cluster is running
- [ ] MongoDB Network Access allows connections (0.0.0.0/0)
- [ ] Code is pushed to GitHub

---

## 🎬 Quick Start - Copy & Paste Commands

### From Your Mac (Terminal):

```bash
# 1. Navigate to your project
cd /Users/Prabhu/Documents/GitHub/Arivu

# 2. Push code to GitHub (if not already done)
git push origin main

# 3. Run deployment (it will ask for your SSH key)
./deploy-from-local.sh

# 4. Wait for completion (5-10 minutes)
# ☕ Grab a coffee!

# 5. Open in browser when done
open http://43.204.144.169
```

---

## 🌐 After Deployment

### Access Your Application

Open in browser: **http://43.204.144.169**

**Login Credentials:**
```
Email:    admin@arivu.com
Password: Admin@123456
```

### ⚠️ FIRST STEPS AFTER LOGIN:

1. **Change admin password immediately!**
   - Go to Settings → Change Password
   
2. **Verify everything works:**
   - Create a test contact
   - Create a test deal
   - Create a test task
   - Test CSV import
   
3. **Create additional users:**
   - Settings → Users → Add User
   - Test different roles (Manager, User, Viewer)

---

## 🔍 Verify Deployment

To check if everything is running correctly:

```bash
# SSH into server
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169

# Check application status
pm2 status

# View logs
pm2 logs arivu-api

# Check backend health
curl http://localhost:5000/api/health
# Should return: {"status":"OK"}

# Check Nginx
sudo systemctl status nginx
```

---

## 📊 What Gets Installed

The deployment script automatically installs and configures:

| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20.x | Backend runtime |
| Nginx | Latest | Web server & reverse proxy |
| PM2 | Latest | Process manager (keeps backend running) |
| Git | Latest | Version control |
| MongoDB Atlas | Cloud | Database (already configured) |

---

## 🛠️ Post-Deployment Management

### View Application Logs

```bash
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169
pm2 logs arivu-api
```

### Restart Application

```bash
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169
pm2 restart arivu-api
```

### Update Application (Deploy New Changes)

```bash
# On your Mac: Push changes
cd /Users/Prabhu/Documents/GitHub/Arivu
git add .
git commit -m "Your changes"
git push origin main

# On EC2: Pull and rebuild
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169
cd /home/ubuntu/Arivu
git pull
cd server && npm install && pm2 restart arivu-api
cd ../client && npm install && npm run build
```

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to EC2"

**Solution:**
```bash
# Check if instance is running in AWS Console
# Check security group allows SSH from your IP
# Try ping:
ping 43.204.144.169
```

### Issue: "502 Bad Gateway" in browser

**Solution:**
```bash
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169

# Check if backend is running
pm2 status

# If not running, restart it
pm2 restart arivu-api

# Check logs for errors
pm2 logs arivu-api --lines 50
```

### Issue: "Blank page" in browser

**Solution:**
```bash
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169

# Check if frontend built successfully
ls -la /home/ubuntu/Arivu/client/dist

# If empty, rebuild
cd /home/ubuntu/Arivu/client
npm run build
```

### Issue: "Database connection error"

**Solution:**
- Check MongoDB Atlas dashboard - is cluster running?
- Check Network Access in Atlas - allows 0.0.0.0/0?
- Verify connection string in server/.env

```bash
ssh -i ~/path/to/your-key.pem ubuntu@43.204.144.169
cat /home/ubuntu/Arivu/server/.env | grep MONGODB_URI
```

---

## 🔒 Security Recommendations

### After deployment, consider:

1. **Change default admin password** ✅ (Do this first!)

2. **Restrict MongoDB Access:**
   - Go to MongoDB Atlas
   - Network Access → Edit
   - Replace 0.0.0.0/0 with your EC2 IP only

3. **Restrict EC2 SSH Access:**
   - Go to AWS Console → EC2 → Security Groups
   - Edit SSH rule to allow only your IP

4. **Setup SSL/HTTPS:**
   - Get a domain name
   - Point it to 43.204.144.169
   - Run: `sudo certbot --nginx -d yourdomain.com`

5. **Enable CloudWatch:**
   - Monitor EC2 metrics
   - Set up billing alerts

6. **Setup Backups:**
   - Enable MongoDB Atlas automated backups
   - Take EC2 snapshots weekly

---

## 💰 Cost Estimate

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| MongoDB Atlas | M0 (Free) | $0 |
| EC2 t2.micro | Free tier (1st year) | $0 |
| EC2 t2.micro | After free tier | ~$8-10 |
| Data Transfer | <1GB/month | ~$1 |
| **Total** | | **$0-11/month** |

---

## 🎓 Learning Resources

### Useful Commands Reference

```bash
# SSH into server
ssh -i ~/key.pem ubuntu@43.204.144.169

# Application management
pm2 status              # Check status
pm2 logs arivu-api   # View logs
pm2 restart arivu-api # Restart app
pm2 monit               # Monitor resources

# System management
sudo systemctl status nginx    # Check Nginx
sudo systemctl restart nginx   # Restart Nginx
df -h                         # Disk space
free -h                       # Memory usage
htop                          # System monitor

# View logs
pm2 logs arivu-api --lines 100
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## ✅ Final Checklist

Before you deploy:

- [ ] MongoDB Atlas is running
- [ ] EC2 instance is running at 43.204.144.169
- [ ] Security groups are configured
- [ ] SSH key file is downloaded
- [ ] Code is pushed to GitHub
- [ ] You have 10 minutes for deployment

After deployment:

- [ ] Application accessible at http://43.204.144.169
- [ ] Login works with admin@arivu.com
- [ ] Changed admin password
- [ ] Created test data
- [ ] All features work (Contacts, Deals, Tasks)
- [ ] PM2 shows backend as "online"

---

## 🚀 Ready to Deploy?

### Quick Deployment (Copy & Paste):

```bash
cd /Users/Prabhu/Documents/GitHub/Arivu
git push origin main
./deploy-from-local.sh
```

**That's it!** ✨

The script will guide you through the rest!

---

## 📞 Need Help?

If something goes wrong:

1. Check the troubleshooting section above
2. SSH into server and check logs: `pm2 logs arivu-api`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify MongoDB Atlas is running
5. Check AWS Console that EC2 is running

---

## 🎉 Success!

Once deployed, you'll have:

- ✅ Full CRM system running on AWS
- ✅ Professional web interface
- ✅ Contact, Deal, and Task management
- ✅ User roles and permissions
- ✅ CSV import/export
- ✅ Calendar and event tracking
- ✅ Automatic crash recovery (PM2)
- ✅ Production-ready setup

**Enjoy your new CRM! 🚀**

---

**Made with ❤️ for easy deployment**

