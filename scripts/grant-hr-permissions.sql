-- Grant hr.manage permission to admin role

-- First, ensure the permission exists
INSERT INTO "Permission" (id, slug, name, description, category, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'hr.manage', 'Manage HR', 'Manage employees and HR settings', 'hr', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Get the admin role ID and hr.manage permission ID, then create the role-permission mapping
INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT 
    r.id as "roleId",
    p.id as "permissionId",
    NOW() as "createdAt"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.slug = 'admin' AND p.slug = 'hr.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Verify the permission was granted
SELECT 
    r.name as role_name,
    p.slug as permission_slug,
    p.description as permission_description
FROM "RolePermission" rp
JOIN "Role" r ON rp."roleId" = r.id
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE r.slug = 'admin' AND p.slug = 'hr.manage';
