'use client';

import React, { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Shield, Lock, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AccessDenied } from '@/components/access-denied';

// Lazy load the user manager component for faster initial page load
const UserPasswordResetManager = dynamic(
  () => import('@/components/admin/user-password-reset-manager').then(mod => ({ default: mod.UserPasswordResetManager })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading user manager...</span>
      </div>
    ),
  }
);

export default function AdminPasswordManagementPage() {
  const { data: session, status } = useSession();

  // Check authorization
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  const hasPermission =
    session?.user?.roles?.includes('owner-super-admin') ||
    session?.user?.roles?.includes('general-manager') ||
    session?.user?.roles?.includes('hr-people-ops') ||
    session?.user?.permissions?.includes('admin.manage_users') ||
    session?.user?.permissions?.includes('user.reset_password');

  if (!hasPermission) {
    return (
      <AccessDenied
        pageName="Password Management"
        requiredPermission="user.reset_password"
        message="You don't have permission to reset user passwords. Only administrators and HR personnel can access this page."
      />
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Lock className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Password Management</h1>
        </div>
        <p className="text-gray-600">Reset user passwords securely from the admin panel</p>
      </div>

      {/* Security Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-base">Security Features</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✓ All password resets are logged in the audit trail</p>
          <p>✓ Only administrators and HR personnel can reset passwords</p>
          <p>✓ Passwords are hashed using bcrypt for security</p>
          <p>✓ New passwords must meet security requirements</p>
          <p>✓ Users should be notified securely after password reset</p>
        </CardContent>
      </Card>

      {/* Password Reset Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Reset User Passwords</CardTitle>
          <CardDescription>
            Select a user and enter a new password. The user will be able to log in with the new password immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          }>
            <UserPasswordResetManager />
          </Suspense>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-base">Best Practices</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Communicate Securely:</strong> Never send passwords through email or chat. Share it verbally, in person, or through a secure channel.
          </p>
          <p>
            <strong>2. Request Immediate Change:</strong> Ask the user to change their password on first login.
          </p>
          <p>
            <strong>3. Use Strong Passwords:</strong> Ensure the temporary password is complex (min 12 characters with symbols).
          </p>
          <p>
            <strong>4. Audit Trail:</strong> All resets are logged and can be reviewed in the audit logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
