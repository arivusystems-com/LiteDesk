# AWS SES Quick Reference Card

## 🎯 Decision: Should I Use AWS SES?
**YES** ✅ - Perfect for CRM transactional emails (not campaigns)

---

## ⚡ Quick Setup (30 minutes)

```bash
# 1. AWS Console Setup
→ Go to: https://console.aws.amazon.com/ses/
→ Choose region: us-east-1
→ Verify email: your-email@gmail.com
→ Create IAM user → Get credentials

# 2. Install Dependencies
cd server
npm install

# 3. Configure .env
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your_key
AWS_SES_SECRET_ACCESS_KEY=your_secret
EMAIL_FROM=noreply@yourdomain.com
ENABLE_EMAIL_NOTIFICATIONS=true

# 4. Test
node test-email.js
```

---

## 💰 Cost Cheat Sheet

| Emails/Month | Cost | vs SendGrid |
|--------------|------|-------------|
| 10,000 | FREE | Save $180/yr |
| 50,000 | $5 | Save $120/yr |
| 100,000 | $10 | Save $960/yr |

---

## 📚 Documentation Index

| Document | Purpose | Time |
|----------|---------|------|
| `AWS_SES_SETUP_GUIDE.md` | Complete setup walkthrough | 30 min |
| `EMAIL_SERVICE_COMPARISON.md` | Why SES vs others | 5 min read |
| `EMAIL_IMPLEMENTATION_CHECKLIST.md` | Full implementation plan | 4-8 hours |
| `AWS_SES_RECOMMENDATION.md` | Executive summary | 10 min read |

---

## 🚀 Implementation Timeline

**MVP (4 hours):**
- AWS setup
- Backend service
- Test sending

**Full Implementation (8 hours):**
- Everything above +
- Frontend UI
- Email templates
- Production deploy

**Your Roadmap (3 days):**
- Week 1, Days 5-7
- Complete with all features

---

## ✅ Essential Checklist

### Before Production:
- [ ] Verify your domain (not just email)
- [ ] Request production access (exit sandbox)
- [ ] Add SPF record: `v=spf1 include:amazonses.com ~all`
- [ ] Add DKIM records (3 CNAMEs)
- [ ] Test with multiple email providers

### After Launch:
- [ ] Monitor bounce rate (< 5%)
- [ ] Monitor complaint rate (< 0.1%)
- [ ] Clean invalid emails weekly
- [ ] Check AWS SES dashboard daily (first week)

---

## 🆘 Quick Troubleshooting

**"Email address not verified"**
→ You're in sandbox. Request production access.

**"Invalid credentials"**
→ Check AWS_SES_ACCESS_KEY_ID and SECRET in .env

**"Emails going to spam"**
→ Add DKIM records, verify domain, warm up sending

**"Rate limit exceeded"**
→ Implement email queue (Bull + Redis)

---

## 📊 SES vs Others (One-Line Summary)

- **AWS SES:** Cheapest, best for transactional ✅ YOUR CHOICE
- **SendGrid:** Best for marketing campaigns + transactional
- **Mailgun:** Developer-friendly, mid-price
- **Postmark:** Premium transactional, expensive
- **Gmail SMTP:** NOT for applications ❌

---

## 🔑 Key AWS SES Limits

| Metric | Sandbox | Production |
|--------|---------|------------|
| Recipients | Only verified | Anyone ✅ |
| Send rate | 1/sec | 14/sec (requestable) |
| Daily quota | 200 | 50,000 (requestable) |

**Always request production access!**

---

## 💻 Code Template

```javascript
// server/services/emailService.js
const AWS = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');

const ses = new AWS.SES({
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { ses, aws: AWS },
});

async function sendEmail({ to, subject, html }) {
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
```

**Full code in:** `docs/AWS_SES_SETUP_GUIDE.md`

---

## 🎯 Use Cases for Arivu

✅ **Transactional:** Password resets, confirmations  
✅ **Customer:** Send from contact pages  
✅ **Notifications:** Task assignments, deal updates  
✅ **Templates:** Welcome, follow-up, proposals  
❌ **Campaigns:** Use Mailchimp/SendGrid instead

---

## 📈 Success Metrics

Track in AWS SES Console:
- ✅ Delivery rate: > 95%
- ✅ Bounce rate: < 5%
- ✅ Complaint rate: < 0.1%
- ✅ Reputation: Good or Excellent

---

## 🚀 Start Here

1. Read: `docs/AWS_SES_SETUP_GUIDE.md` (detailed)
2. Or: `AWS_SES_RECOMMENDATION.md` (overview)
3. Follow: `EMAIL_IMPLEMENTATION_CHECKLIST.md` (step-by-step)
4. Compare: `EMAIL_SERVICE_COMPARISON.md` (alternatives)

**Bottom line:** AWS SES is perfect for your use case. Set it up! 🎉

---

## 📞 Key URLs

- **SES Console:** https://console.aws.amazon.com/ses/
- **IAM Console:** https://console.aws.amazon.com/iam/
- **SES Pricing:** https://aws.amazon.com/ses/pricing/
- **SES Docs:** https://docs.aws.amazon.com/ses/

---

*Print this for quick reference during implementation!*

