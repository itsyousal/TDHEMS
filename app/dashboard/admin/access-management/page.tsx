'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Shield, Users } from 'lucide-react';
import { UserPermissionManager } from '@/components/admin/user-permission-manager';
import { AccessDenied } from '@/components/access-denied';

export default function AccessManagementPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  // Check authorization
  const hasPermission =
    session?.user?.roles?.includes('owner-super-admin') ||
    session?.user?.permissions?.includes('admin.manage_users');

  if (!hasPermission) {
    return (
      <AccessDenied
        pageName="Access Management"
        requiredPermission="admin.manage_users"
        message="Only administrators can manage user permissions."
      />
    );
  }

  const orgId = session?.user?.organizationId || '';

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Access Management</h1>
        </div>
        <p className="text-gray-600">Manage user roles and permissions across your organization</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What is Access Management */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <CardTitle className="text-base">What is This?</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Manage which roles and permissions each user has in your organization.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Assign roles to users</li>
              <li>View permissions by role</li>
              <li>Bulk role management</li>
              <li>Audit all changes</li>
            </ul>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-1 flex-shrink-0" />
              <div>
                <CardTitle className="text-base">How to Use</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ol className="list-decimal list-inside space-y-1">
              <li>Find the user in the list below</li>
              <li>Click the "Manage" button</li>
              <li>Select the roles to assign</li>
              <li>Review permissions and save</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* User Permission Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Select a user to manage their roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserPermissionManager orgId={orgId} />
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-base">Best Practices</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Principle of Least Privilege:</strong> Only grant users the permissions they need to perform their job.
          </p>
          <p>
            <strong>Use Roles:</strong> Assign roles instead of individual permissions when possible for easier management.
          </p>
          <p>
            <strong>Regular Audits:</strong> Review user permissions periodically to ensure they're still appropriate.
          </p>
          <p>
            <strong>Document Changes:</strong> All permission changes are logged in the audit trail for security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
