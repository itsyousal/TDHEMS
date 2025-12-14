# AccessDenied Component Usage Guide

## Overview

The `AccessDenied` component provides a **consistent, unified user experience** for all permission denied scenarios across the website. Use this component whenever a user tries to access a page or feature they don't have permission for.

## Single Component for All Contexts

There is now **ONE component** for all use cases:

- **Client Components**: Use `AccessDenied` directly
- **Server Components**: Use `AccessDenied` (it's marked with 'use client' internally)
- **Legacy Import**: `AccessDeniedPage` is now just an alias to `AccessDenied` for backward compatibility

```tsx
// Both approaches now use the same underlying component
import { AccessDenied } from '@/components/access-denied';
import { AccessDeniedPage } from '@/components/access-denied-page'; // Re-exports AccessDenied

// They're identical - use AccessDenied for consistency
```

## Basic Usage

### Client Components

```tsx
'use client';

import { AccessDenied } from '@/components/access-denied';

export function MyComponent() {
  const hasAccess = checkPermissions();

  if (!hasAccess) {
    return (
      <AccessDenied
        pageName="My Page"
        requiredPermission="my.permission"
      />
    );
  }

  return <div>Content here</div>;
}
```

### Server Components

```tsx
import { AccessDenied } from '@/components/access-denied';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export default async function MyPage() {
  const session = await getAuthSession();
  const hasAccess = await hasPermission(session.user.id, 'my.permission', session.user.organizationId);

  if (!hasAccess) {
    return (
      <AccessDenied
        pageName="My Page"
        requiredPermission="my.permission"
      />
    );
  }

  return <div>Content here</div>;
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pageName` | string | Yes | Name of the page/feature (e.g., "Marketing", "CRM", "Admin Dashboard") |
| `requiredPermission` | string | No | Permission slug that was required (e.g., "marketing.view", "admin.manage_users") |
| `message` | string | No | Custom message to display instead of the default |

## Examples

### Minimal Usage

```tsx
<AccessDenied pageName="Finance Dashboard" />
```

### With Permission and Message

```tsx
<AccessDenied
  pageName="Finance Dashboard"
  requiredPermission="finance.view"
  message="Only finance managers can access this section. Contact your administrator if you need access."
/>
```

## Component Features

The component automatically provides:

- ✅ Consistent red/pink gradient background
- ✅ Clear lock icon and messaging
- ✅ Display of required permission (if provided)
- ✅ Help text for contacting administrators
- ✅ "Back to Dashboard" button
- ✅ "View Account Settings" link
- ✅ Responsive mobile design
- ✅ Accessible color contrast and structure

## Pages Currently Using AccessDenied

- `/dashboard/admin/access-management` - Access Management
- `/dashboard/admin/password-management` - Password Management
- `/dashboard/finance` - Finance
- `/dashboard/crm` - CRM
- `/dashboard/marketing` - Marketing
- `/dashboard/customers` - Customers

## Adding to New Pages

When you need to restrict access to a new page:

1. **Import the component**:
   ```tsx
   import { AccessDenied } from '@/components/access-denied';
   ```

2. **Check permissions**:
   ```tsx
   const hasAccess = await hasPermission(userId, 'required.permission', orgId);
   ```

3. **Return the component if denied**:
   ```tsx
   if (!hasAccess) {
     return (
       <AccessDenied
         pageName="Page Name"
         requiredPermission="required.permission"
       />
     );
   }
   ```

## Migration from Old Approach

If you find any pages still using different access denied approaches:

```tsx
// ❌ OLD: Multiple different approaches
redirect('/'); // Don't do this - silent redirect
<div>Access Denied</div> // Don't do this - inconsistent
<CustomAccessDeniedComponent /> // Don't do this - fragmented UX

// ✅ NEW: Use AccessDenied everywhere
<AccessDenied pageName="..." requiredPermission="..." />
```

## Styling Customization

The component uses Tailwind CSS classes. If you need to customize the appearance globally:

1. Edit the component at `/components/access-denied.tsx`
2. Modify the `className` values
3. All pages will automatically reflect the changes

## Future Enhancements

Potential improvements to consider:

- Add animation on first load
- Support for requesting access workflow
- Customizable button actions
- Dark mode support
- Multiple permission options (e.g., "requires X or Y permission")
