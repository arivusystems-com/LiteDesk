# After Registration - Run This

After you register, run this command:

```bash
cd /Users/Prabhu/Documents/GitHub/Arivu/server
node scripts/verifySetup.js
```

## Expected Output:

```
✅ Organization: My Test Company
   - ID: 67xxx...
   - Industry: Retail
   - Status: trial (trial)
   - Trial ends: [15 days from now]
   - Users: 1
     • your@email.com (owner, Owner)

✅ All users properly linked to organizations
```

## If You Don't See This:

1. Check server console - did you see the "📝 Registration Request Received" logs?
2. If NO logs → Server not running or browser not sending request
3. If YES logs but error → Copy the error message
4. If YES logs but no org → There's a code issue

## Quick Debug Command:

```bash
# See what's in database
cd /Users/Prabhu/Documents/GitHub/Arivu/server
node scripts/checkData.js
```

Should show:
- Organizations found: 1 ✅
- Users found: 1 ✅
- User has organizationId ✅
- User role: owner ✅

