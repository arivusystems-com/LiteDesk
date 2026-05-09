# 🚨 Fix 403 Forbidden Error

## What Happened?

You deployed successfully but got: **403 Forbidden** error in the browser.

## Why This Happens?

**Nginx Permission Issue:**

```
Nginx runs as:     www-data user
Your files are in: /home/ubuntu/Arivu/ (owned by ubuntu)

Nginx needs permission to:
  1. Access /home/ubuntu/ (execute permission)
  2. Access /home/ubuntu/Arivu/ (execute permission)
  3. Read files in /home/ubuntu/Arivu/client/dist/ (read permission)
```

## ✅ Quick Fix (1 Command)

```bash
./fix-permissions.sh
```

That's it! The script will:
1. Connect to EC2
2. Fix all permissions
3. Restart Nginx
4. Done!

---

## Manual Fix (If You Prefer)

SSH into your EC2:

```bash
ssh -i ~/path/to/key.pem ubuntu@13.203.208.47
```

Then run these commands:

```bash
# Fix directory permissions (755 = owner can do all, others can read/execute)
chmod 755 /home/ubuntu
chmod 755 /home/ubuntu/Arivu
chmod 755 /home/ubuntu/Arivu/client
chmod -R 755 /home/ubuntu/Arivu/client/dist

# Restart Nginx
sudo systemctl restart nginx

# Test
curl http://localhost
```

---

## Understanding the Permissions

### What the numbers mean:

```
755 = rwxr-xr-x
  7 = rwx (owner: read, write, execute)
  5 = r-x (group: read, execute)
  5 = r-x (others: read, execute)
```

### Why 755?

- **Owner (ubuntu):** Full access (rwx = 7)
- **Group & Others (including www-data):** Read + Execute (r-x = 5)
- Nginx (www-data) can **read files** and **traverse directories**

---

## Verify It's Fixed

After running the fix script:

```bash
# Check if website loads
curl http://13.203.208.47

# Should see HTML content, not 403 error
```

Or just open in browser: **http://13.203.208.47**

---

## Common Permission Errors

### 403 Forbidden
**Cause:** Nginx can't read files
**Fix:** `chmod 755` on directories

### 404 Not Found
**Cause:** Files don't exist
**Fix:** Check if `dist/` folder exists

### 502 Bad Gateway
**Cause:** Backend not running
**Fix:** `pm2 restart arivu-api`

---

## Check Permissions

To see current permissions:

```bash
ssh -i ~/key.pem ubuntu@13.203.208.47

# Check home directory
ls -la /home/ | grep ubuntu

# Check Arivu directory
ls -la /home/ubuntu/ | grep Arivu

# Check client/dist
ls -la /home/ubuntu/Arivu/client/

# Should see:
# drwxr-xr-x  ubuntu ubuntu  Arivu
# drwxr-xr-x  ubuntu ubuntu  client
# drwxr-xr-x  ubuntu ubuntu  dist
```

---

## Nginx Error Log

To see what Nginx is complaining about:

```bash
sudo tail -f /var/log/nginx/error.log
```

Common errors:
- `Permission denied` → Fix permissions with script
- `No such file or directory` → Check if dist/ exists
- `Connection refused` → Backend not running

---

## Prevention

The updated `deploy-local-build.sh` now automatically sets correct permissions during deployment, so this won't happen again on future deployments!

---

## Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| 403 Forbidden | Permissions | `./fix-permissions.sh` |
| 404 Not Found | Missing files | Check `dist/` exists |
| 502 Bad Gateway | Backend down | `pm2 restart arivu-api` |
| Connection Refused | EC2 stopped | Start EC2 instance |

---

## After Fix

Once fixed, you should see:

✅ Login page loads  
✅ No 403 errors  
✅ Static files load (CSS, JS)  
✅ Can login with: admin@arivu.com / Admin@123456

---

## Still Not Working?

Run these debug commands:

```bash
ssh -i ~/key.pem ubuntu@13.203.208.47

# 1. Check if files exist
ls -la /home/ubuntu/Arivu/client/dist/
ls -la /home/ubuntu/Arivu/client/dist/index.html

# 2. Check Nginx config
sudo nginx -t

# 3. Check Nginx is running
sudo systemctl status nginx

# 4. Check backend is running
pm2 status

# 5. Check backend logs
pm2 logs arivu-api --lines 50

# 6. Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# 7. Test backend directly
curl http://localhost:5000/api/health

# 8. Test frontend through Nginx
curl http://localhost/
```

---

## Need Help?

Check these in order:

1. ✅ Files exist in `dist/` folder?
2. ✅ Permissions are 755?
3. ✅ Nginx is running?
4. ✅ Backend is running (pm2 status)?
5. ✅ No errors in logs?

If all ✅, it should work!

---

## Summary

**Problem:** 403 Forbidden  
**Cause:** Nginx permission issue  
**Fix:** `./fix-permissions.sh`  
**Time:** 30 seconds  

That's it! 🎉

