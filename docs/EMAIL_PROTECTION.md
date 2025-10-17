# 📧 Email Protection System

## 🚨 Critical Problem This Solves

**Before**: Emails were sent directly to real customers in development environments when using production data, risking customer confusion and potential regulatory issues.

**After**: Multi-layer email protection system that automatically prevents accidental emails to real customers based on environment detection.

## 🛡️ Protection Modes

The system automatically detects your environment and applies appropriate email handling:

### 1. **`disabled`** - Complete Email Blocking
- **When**: Testing, unit tests
- **Behavior**: No emails sent at all
- **Use Case**: Automated testing, CI/CD
- **Safety**: ✅ 100% Safe

### 2. **`console`** - Console Logging Only
- **When**: Development without file logging
- **Behavior**: Pretty-printed email content to console
- **Use Case**: Development debugging
- **Safety**: ✅ 100% Safe

### 3. **`file`** - File + Console Logging (Default for Development)
- **When**: Development with production data
- **Behavior**: Saves emails to timestamped JSON files + console logging
- **File Location**: `{PROJECT_DIR}/logs/emails/email-{timestamp}.json`
- **Use Case**: **Your current situation - safest for dev with real data**
- **Safety**: ✅ 100% Safe

### 4. **`redirect`** - Developer Email Redirection
- **When**: Staging environments, integration testing
- **Behavior**: All emails redirected to developer email with clear warning headers
- **Subject Modified**: `[DEV-REDIRECT] [TO: original@email.com] Original Subject`
- **Use Case**: Testing email flows without bothering real users
- **Safety**: ✅ Safe (if developer email is correct)

### 5. **`staging`** - Whitelisted Email Sending
- **When**: Staging environments with controlled testing
- **Behavior**: Only sends to pre-approved email addresses/domains
- **Use Case**: QA testing with real team members
- **Safety**: ⚠️ Moderate (only to approved emails)

### 6. **`production`** - Normal Email Sending
- **When**: Production environments only
- **Behavior**: Normal email sending with audit logging
- **Use Case**: Live production environment
- **Safety**: ❌ Sends to real customers

## 🔄 Automatic Environment Detection

The system automatically determines the email mode using this priority:

1. **`EMAIL_MODE`** environment variable (explicit override)
2. **`CREATE_MOCK_DATA=true`** → `file` mode (your current setup)
3. **`NODE_ENV=development`** → `file` mode
4. **`NODE_ENV=test`** → `disabled` mode
5. **`NODE_ENV=staging`** → `redirect` mode
6. **`SERVER_LOCATION=local`** → `file` mode (your current setup)
7. **Default** → `production` mode

## ⚙️ Configuration

### Required Environment Variables (Already in your .env)
```bash
# Email credentials (for production/redirect/staging modes)
SITE_EMAIL_USERNAME=youremail@gmail.com
SITE_EMAIL_PASSWORD=youremailpassword
SITE_EMAIL_FROM="Your Business Name"
SITE_EMAIL_ALIAS=alias@yourbusiness.com
```

### New Protection Variables (Add to your .env)
```bash
# Email protection mode (explicit override)
EMAIL_MODE=file

# Developer email for redirects (staging/redirect modes)
DEV_EMAIL_REDIRECT=developer@yourcompany.com

# Staging whitelist (staging mode only)
STAGING_ALLOWED_EMAIL_DOMAINS=yourcompany.com,gmail.com
STAGING_ALLOWED_EMAILS=test@yourcompany.com,qa@yourcompany.com
```

## 📁 Development Email Files

When using `file` mode, emails are saved to:

```
{PROJECT_DIR}/logs/emails/
├── email-2024-01-15T10-30-45-123Z.json
├── email-2024-01-15T10-31-02-456Z.json
└── ...
```

Each file contains:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "mode": "file",
  "from": "\"New Life Nursery\" <contact@newlifenursery.com>",
  "to": ["customer@example.com"],
  "subject": "Welcome to New Life Nursery!",
  "text": "Welcome text...",
  "html": "<html>Welcome HTML...</html>",
  "environment": {
    "NODE_ENV": "development",
    "SERVER_LOCATION": "local",
    "CREATE_MOCK_DATA": "true"
  }
}
```

## 🎯 Your Current Setup

Based on your configuration:
- **`CREATE_MOCK_DATA=true`** → Automatically uses `file` mode
- **`SERVER_LOCATION=local`** → Confirms development environment
- **Production customer data** → Protected by file logging

**Result**: All emails are safely logged to files instead of being sent to real customers! ✅

## 🔍 Monitoring Email Activity

### Console Output
```bash
📧 EMAIL INTERCEPTED IN DEVELOPMENT
================================================================================
From: "New Life Nursery" <contact@newlifenursery.com>
To: customer@realcustomer.com
Subject: Welcome to New Life Nursery!
--------------------------------------------------------------------------------
TEXT CONTENT:
Welcome to New Life Nursery! Please verify your account...
--------------------------------------------------------------------------------
HTML CONTENT:
<html><body>Welcome to New Life Nursery!...</body></html>
================================================================================
```

### Log Output
```bash
[INFO] 📧 Email processed in file mode: Email saved to file and logged to console
  originalRecipients: ["customer@realcustomer.com"]
  filePath: "/srv/app/logs/emails/email-2024-01-15T10-30-45-123Z.json"
```

## 🚀 Quick Setup for Your Environment

1. **Add to your `.env` file**:
   ```bash
   EMAIL_MODE=file
   DEV_EMAIL_REDIRECT=your-developer-email@yourcompany.com
   ```

2. **That's it!** The system will automatically:
   - Detect your development environment
   - Use `file` mode to safely log emails
   - Prevent any emails from reaching real customers
   - Save all email content for review

## 🔧 Testing Different Modes

```bash
# Test disabled mode (no emails at all)
EMAIL_MODE=disabled yarn start-development

# Test console mode (console only)
EMAIL_MODE=console yarn start-development

# Test redirect mode (redirect to your email)
EMAIL_MODE=redirect DEV_EMAIL_REDIRECT=your@email.com yarn start-development

# Test file mode (save to files - default)
EMAIL_MODE=file yarn start-development
```

## 🚨 Production Deployment Checklist

Before deploying to production:

- [ ] Verify `NODE_ENV=production`
- [ ] Verify `EMAIL_MODE` is unset or `production`
- [ ] Verify `CREATE_MOCK_DATA=false`
- [ ] Test email sending in staging first
- [ ] Verify email credentials are correct
- [ ] Monitor email logs for any issues

## 📊 Email Types Protected

All email types are now protected:

1. **Welcome/Verification Emails** (`sendVerificationLink`)
2. **Password Reset Emails** (`sendResetPasswordLink`)
3. **Admin Notifications** (`customerNotifyAdmin`, `orderNotifyAdmin`)
4. **Feedback Notifications** (`feedbackNotifyAdmin`)
5. **Custom Emails** (`sendMail`)

## 🔍 Troubleshooting

### Issue: Emails not appearing in console
**Solution**: Check that your email mode is `console` or `file`

### Issue: Email files not being created
**Solution**: Ensure the `/logs/emails` directory is writable

### Issue: Still worried about accidental sends
**Solution**: Use `EMAIL_MODE=disabled` for complete peace of mind

### Issue: Need to test actual email delivery
**Solution**: Use `EMAIL_MODE=redirect` with your personal email

## 🎉 Benefits

✅ **Zero Risk**: No accidental emails to real customers  
✅ **Automatic**: Works based on environment detection  
✅ **Flexible**: Multiple protection modes for different scenarios  
✅ **Auditable**: Complete email logging and tracking  
✅ **Developer Friendly**: Clear console output and file logging  
✅ **Production Ready**: Seamless transition to production  

**Your customer data is now 100% protected from accidental email sends!** 🛡️