# Password Reset Feature

## Overview

This feature allows administrators and HR personnel to securely reset user passwords through the admin dashboard.

## Components

### 1. API Endpoint: `/api/auth/reset-password`
- **Method:** POST
- **Authentication:** Required (session-based)
- **Authorization:** Requires `user.reset_password` or `admin.manage_users` permission
- **Payload:**
  ```json
  {
    "userId": "string (UUID)",
    "newPassword": "string (min 8 characters)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password reset for John Doe",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
  ```

### 2. UI Components

#### ResetPasswordDialog
Located at: `components/admin/reset-password-dialog.tsx`

Features:
- Password strength indicator
- Password confirmation with visual feedback
- Show/hide password toggles
- Security warnings
- Input validation
- Real-time password matching indicator

#### UserPasswordResetManager
Located at: `components/admin/user-password-reset-manager.tsx`

Features:
- Search users by name or email
- Display all users with their roles and status
- Reset password action for each user
- Responsive table layout

### 3. Admin Page
Located at: `app/dashboard/admin/password-management/page.tsx`

Features:
- Role-based access control (Admin only)
- Security information card
- Best practices guide
- User password reset manager
- Audit trail information

## Setup Instructions

### 1. Add Permissions to Database

Run the seed script to create the `user.reset_password` permission and assign it to admin and HR roles:

```bash
npx ts-node prisma/seed-password-reset.ts
```

This will:
- Create the `user.reset_password` permission
- Assign it to the `admin` role
- Assign it to the `hr` role (if it exists)

### 2. Update NextAuth Configuration (Optional)

The feature uses the existing NextAuth session. No additional configuration is needed if you've already set up authentication.

### 3. Add Navigation Link

Add a link to the password management page in your admin navigation:

```tsx
<Link href="/dashboard/admin/password-management">
  <Key className="h-4 w-4" />
  Password Management
</Link>
```

## Security Considerations

### ✓ What's Secure
- Passwords are hashed with bcrypt (10 rounds)
- Password reset requires admin/HR authentication
- Only accessible via session (not API key based)
- All resets are logged in the audit trail
- Password strength requirements enforced
- Session-based authorization checks

### ⚠ Best Practices
1. **Communicate Securely**: Never send passwords via email or chat
2. **Share Verbally**: Best method is in-person or phone call
3. **Request Change**: Ask user to change password on first login
4. **Use Strong Passwords**: Ensure temporary passwords are complex
5. **Document in Audit Log**: All resets are automatically logged
6. **Notify User**: Inform user their password was reset

### ❌ What NOT to Do
- Don't send passwords in email
- Don't store passwords in plain text
- Don't skip audit logging
- Don't allow users to set their own passwords through this endpoint
- Don't create weak temporary passwords

## Password Requirements

- Minimum 8 characters
- For strong passwords, include:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)

## Audit Logging

All password resets are logged with:
- Admin who performed the reset
- User whose password was changed
- Timestamp
- Action type: `PASSWORD_RESET_BY_ADMIN`

Check the audit logs in the admin dashboard to track all password resets.

## Troubleshooting

### "Insufficient permissions" error
- Ensure user has `admin` role or `user.reset_password` permission
- Run the seed script: `npx ts-node prisma/seed-password-reset.ts`

### Password validation fails
- Password must be at least 8 characters
- Confirm both password fields match
- No special length limit (database field is TEXT)

### User cannot log in after reset
- Verify the password is correct
- Check if user account is active (`isActive = true`)
- Verify no recent changes to authentication config

## API Usage Examples

### Using cURL
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "userId": "user-uuid-here",
    "newPassword": "NewSecurePassword123!@#"
  }'
```

### Using JavaScript/Fetch
```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid-here',
    newPassword: 'NewSecurePassword123!@#'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Password reset successfully');
}
```

## Future Enhancements

- [ ] Email notification to user after password reset
- [ ] Temporary password generator
- [ ] Password reset confirmation (require 2FA from admin)
- [ ] Bulk password reset for multiple users
- [ ] Password expiration policies
- [ ] Force password change on next login flag
- [ ] Password reset token-based flow (instead of direct reset)
