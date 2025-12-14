/**
 * Helper function to check permissions and return either data or access denied component
 * Usage in server components:
 * 
 * const result = await checkAccess({
 *   userId: session.user.id,
 *   orgId: session.user.organizationId,
 *   requiredPermissions: ['finance.view'],
 *   pageName: 'Finance',
 * });
 * 
 * if (result.denied) {
 *   return <AccessDenied {...result.deniedProps} />;
 * }
 */

import { ReactNode } from 'react';
import { hasPermission } from './rbac';

interface CheckAccessOptions {
  userId: string;
  orgId: string;
  requiredPermissions: string | string[];
  pageName: string;
  message?: string;
}

interface AccessCheckResult {
  denied: boolean;
  deniedProps?: {
    pageName: string;
    requiredPermission?: string;
    message?: string;
  };
}

export async function checkAccess(
  options: CheckAccessOptions
): Promise<AccessCheckResult> {
  const {
    userId,
    orgId,
    requiredPermissions,
    pageName,
    message,
  } = options;

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  // Check if user has at least one of the required permissions
  const hasAccess = await Promise.all(
    permissions.map(perm => hasPermission(userId, perm, orgId))
  ).then(results => results.some(result => result === true));

  if (!hasAccess) {
    return {
      denied: true,
      deniedProps: {
        pageName,
        requiredPermission: Array.isArray(requiredPermissions)
          ? requiredPermissions.join(', ')
          : requiredPermissions,
        message,
      },
    };
  }

  return { denied: false };
}
