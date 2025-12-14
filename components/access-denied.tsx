'use client';

import React from 'react';
import { Lock, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AccessDeniedProps {
  pageName: string;
  requiredPermission?: string;
  message?: string;
}

/**
 * Unified access denied component for displaying when users lack permissions
 * Use for both client and server components for consistent messaging
 */
export function AccessDenied({
  pageName,
  requiredPermission,
  message,
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">
              {message || `You don't have permission to access the ${pageName} page.`}
            </p>
          </div>

          {/* Required Permission */}
          {requiredPermission && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Required Permission:</strong> {requiredPermission}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p>
              If you believe you should have access to this page, please contact your administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full" variant="default">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/settings" className="w-full">
              <Button className="w-full" variant="outline">
                View Account Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
