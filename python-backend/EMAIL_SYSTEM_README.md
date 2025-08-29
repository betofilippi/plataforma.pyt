# Email System for User Confirmation

This document describes the complete email system implemented for user confirmation, registration, and admin notifications in the Plataforma Python backend.

## Overview

The email system provides:

- ✅ Professional HTML email templates with plataforma.app branding
- ✅ SMTP configuration with support for Gmail, Outlook, Yahoo, and custom servers
- ✅ User registration with email verification
- ✅ Account approval/rejection notifications
- ✅ Welcome emails for new users
- ✅ Fallback to console logging for development
- ✅ Async email sending with proper error handling

## Features Implemented

### 1. Email Service (`/app/services/email_service.py`)

**Professional Templates:**
- Welcome email with user info and platform access
- Email verification with secure tokens
- Account approval notification
- Account rejection with optional reason

**SMTP Support:**
- Gmail (smtp.gmail.com:587)
- Outlook (smtp-mail.outlook.com:587)
- Yahoo (smtp.mail.yahoo.com:587)
- Custom SMTP servers

**Security Features:**
- TLS encryption by default
- Proper authentication
- Token-based email verification
- XSS protection in templates

### 2. API Endpoints

#### User Registration
```http
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "name": "User Name",
  "password": "secure_password",
  "role": "user",
  "send_verification": true
}
```

#### Email Verification
```http
GET /api/v1/auth/verify-email/{token}
```

#### Admin User Approval
```http
POST /api/v1/admin/users/{user_id}/approve
{
  "user_id": "user-123",
  "approved": true,
  "rejection_reason": "Optional reason if rejected"
}
```

#### Get Pending Users (Admin Only)
```http
GET /api/v1/admin/pending-users
```

## Configuration

### Environment Variables

Create or update your `.env` file with SMTP settings:

```env
# Email Provider: gmail, outlook, yahoo, or custom
EMAIL_PROVIDER=gmail

# SMTP Settings (Required for email functionality)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true
```

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the generated 16-character password as `SMTP_PASSWORD`

### Outlook/Hotmail Setup

```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo Setup

```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### Custom SMTP Setup

```env
SMTP_SERVER=your-smtp-server.com
SMTP_PORT=587
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
SMTP_USE_TLS=true
```

## User Flow

### Registration Process

1. **User Registration**
   - User submits registration form
   - Account created with `status: "pending"`
   - Verification email sent automatically
   - User receives email with verification link

2. **Email Verification**
   - User clicks verification link
   - Account status updated to `status: "pending"`
   - Admin notification created
   - User sees "pending approval" message

3. **Admin Approval**
   - Admin views pending users
   - Admin approves or rejects account
   - Appropriate email sent to user
   - Account status updated accordingly

### Account States

- `pending` - New registration, needs email verification or admin approval
- `active` - Approved and can login
- `inactive` - Temporarily disabled
- `suspended` - Suspended by admin
- `rejected` - Rejected by admin

## Email Templates

All templates feature:

- Responsive design (mobile-friendly)
- Professional plataforma.app branding
- Consistent color scheme (purple gradient)
- Clear call-to-action buttons
- Portuguese language support
- Proper fallback text versions

### Template Variables

Templates use mustache-like syntax:
- `{{app_name}}` - Application name
- `{{user_name}}` - User's name  
- `{{user_email}}` - User's email
- `{{base_url}}` - Application base URL
- `{{current_year}}` - Current year
- `{{verification_url}}` - Email verification link
- `{{login_url}}` - Login page URL

## Development Mode

When SMTP is not configured:
- Emails are logged to console instead
- All email functions return `true` (success)
- Full email content displayed in logs
- No actual emails sent

Example console output:
```
================================================================================
EMAIL SERVICE - DEVELOPMENT MODE
================================================================================
TO: user@example.com
SUBJECT: Bem-vindo(a) ao Plataforma!
VARIABLES:
  user_name: John Doe
  user_email: user@example.com
  user_role: user
================================================================================
```

## Usage Examples

### Send Welcome Email

```python
from app.services.email_service import send_welcome_email

# Send welcome email
success = await send_welcome_email(
    user_email="user@example.com",
    user_name="John Doe",
    user_role="user"
)
```

### Send Verification Email

```python
from app.services.email_service import send_verification_email

# Send verification email
success = await send_verification_email(
    user_email="user@example.com",
    user_name="John Doe",
    verification_token="verify-abc123"
)
```

### Send Approval Email

```python
from app.services.email_service import send_approval_email

# Send approval notification
success = await send_approval_email(
    user_email="user@example.com",
    user_name="John Doe",
    user_role="user",
    approved_by="Admin User"
)
```

### Send Rejection Email

```python
from app.services.email_service import send_rejection_email

# Send rejection notification
success = await send_rejection_email(
    user_email="user@example.com",
    user_name="John Doe",
    reviewed_by="Admin User",
    rejection_reason="Incomplete profile information"
)
```

## Error Handling

The email service includes comprehensive error handling:

1. **Configuration Validation**
   - Checks if SMTP settings are provided
   - Falls back to console logging if not configured

2. **SMTP Connection Errors**
   - Handles authentication failures
   - Handles network connectivity issues
   - Falls back to console logging on failure

3. **Template Errors**
   - Validates template variables
   - Provides sensible defaults for missing data

4. **Async Execution**
   - Non-blocking email sending
   - Doesn't interrupt user registration flow
   - Background task execution

## Testing

### Manual Testing

1. **Setup Test SMTP**
   ```env
   EMAIL_PROVIDER=gmail
   SMTP_USERNAME=your-test-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

2. **Test Registration**
   ```bash
   curl -X POST "http://localhost:8001/api/v1/auth/register" \
   -H "Content-Type: application/json" \
   -d '{
     "email": "test@example.com",
     "name": "Test User",
     "password": "testpass123",
     "send_verification": true
   }'
   ```

3. **Check Email**
   - Verify email received in inbox
   - Check spam/junk folder if not found
   - Test verification link

### Console Testing (Development)

1. **No SMTP Configuration**
   - Leave SMTP settings blank
   - All emails logged to console
   - Useful for development/testing

2. **Check Logs**
   ```bash
   cd python-backend
   python -m uvicorn app.main_full:app --reload
   # Make registration request
   # Check console output for email content
   ```

## Troubleshooting

### Common Issues

**1. "Module not found" errors**
- Ensure all dependencies are installed
- Check Python path configuration

**2. SMTP Authentication Failed**
- Verify credentials are correct
- For Gmail, use App Password, not account password
- Check 2FA is enabled for Gmail

**3. Emails not received**
- Check spam/junk folders
- Verify SMTP server settings
- Test with different email provider

**4. Template rendering errors**
- Check template variable names
- Ensure all required variables provided
- Review template syntax

### Debug Mode

Enable detailed logging:

```python
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

## Security Considerations

1. **Environment Variables**
   - Never commit SMTP passwords to git
   - Use strong app passwords
   - Rotate credentials regularly

2. **Email Verification**
   - Tokens expire after 24 hours
   - One-time use tokens
   - Secure token generation

3. **Template Security**
   - HTML content is escaped
   - No user input in templates without sanitization
   - XSS protection implemented

## Production Deployment

### Recommendations

1. **Use Dedicated Email Service**
   - Consider services like SendGrid, Mailgun
   - Better deliverability rates
   - Advanced analytics

2. **Environment Configuration**
   ```env
   ENVIRONMENT=production
   SMTP_SERVER=smtp.sendgrid.net
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   ```

3. **Monitoring**
   - Monitor email delivery rates
   - Log failed email attempts
   - Alert on service failures

4. **Backup Strategy**
   - Implement queue system for reliability
   - Retry failed email attempts
   - Alternative notification methods

## API Documentation

The complete email system is integrated with FastAPI's automatic documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

All email-related endpoints are documented with:
- Request/response schemas
- Example payloads
- Error codes and descriptions
- Authentication requirements

---

## Summary

This email system provides a complete, production-ready solution for user confirmation and notifications. It includes:

✅ **Professional Templates** - Branded, responsive HTML emails  
✅ **Multiple SMTP Providers** - Gmail, Outlook, Yahoo, custom  
✅ **Complete User Flow** - Registration → Verification → Approval  
✅ **Development Mode** - Console logging fallback  
✅ **Error Handling** - Comprehensive failure recovery  
✅ **Security** - Token-based verification, XSS protection  
✅ **Documentation** - Complete setup and usage guide  

The system is ready for production use with proper SMTP configuration and can seamlessly fall back to development mode when needed.