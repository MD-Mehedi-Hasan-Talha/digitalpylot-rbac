import bcrypt from 'bcrypt';
import 'dotenv/config';
import prisma from './config/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── 1. Create Roles ────────────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', level: 4 },
    }),
    prisma.role.upsert({
      where: { name: 'manager' },
      update: {},
      create: { name: 'manager', level: 3 },
    }),
    prisma.role.upsert({
      where: { name: 'agent' },
      update: {},
      create: { name: 'agent', level: 2 },
    }),
    prisma.role.upsert({
      where: { name: 'customer' },
      update: {},
      create: { name: 'customer', level: 1 },
    }),
  ]);

  const [adminRole, managerRole, agentRole, customerRole] = roles;
  console.log('  ✅ Roles created');

  // ─── 2. Create Permissions ──────────────────────────────────────────────────
  const permissionAtoms = [
    { atom: 'page:dashboard', label: 'View Dashboard', category: 'page' },
    { atom: 'page:users', label: 'View Users Page', category: 'page' },
    { atom: 'page:leads', label: 'View Leads Page', category: 'page' },
    { atom: 'page:tasks', label: 'View Tasks Page', category: 'page' },
    { atom: 'page:reports', label: 'View Reports Page', category: 'page' },
    { atom: 'page:audit_log', label: 'View Audit Log Page', category: 'page' },
    { atom: 'page:settings', label: 'View Settings Page', category: 'page' },
    { atom: 'page:customer_portal', label: 'View Customer Portal', category: 'page' },
    { atom: 'action:create_user', label: 'Create User', category: 'action' },
    { atom: 'action:edit_user', label: 'Edit User', category: 'action' },
    { atom: 'action:suspend_user', label: 'Suspend User', category: 'action' },
    { atom: 'action:ban_user', label: 'Ban User', category: 'action' },
    { atom: 'action:manage_permissions', label: 'Manage Permissions', category: 'action' },
    { atom: 'action:view_audit_log', label: 'View Audit Log', category: 'action' },
  ];

  const permissions = await Promise.all(
    permissionAtoms.map((p) =>
      prisma.permission.upsert({
        where: { atom: p.atom },
        update: {},
        create: p,
      })
    )
  );
  console.log('  ✅ Permissions created');

  // ─── 3. Assign Default Role Permissions ─────────────────────────────────────

  // Admin gets ALL permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Manager gets most, except audit_log and manage_permissions
  const managerAtoms = [
    'page:dashboard', 'page:users', 'page:leads', 'page:tasks',
    'page:reports', 'page:settings',
    'action:create_user', 'action:edit_user', 'action:suspend_user',
  ];
  for (const atom of managerAtoms) {
    const perm = permissions.find((p: { atom: string }) => p.atom === atom);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }

  // Agent gets basic pages
  const agentAtoms = [
    'page:dashboard', 'page:leads', 'page:tasks',
  ];
  for (const atom of agentAtoms) {
    const perm = permissions.find((p: { atom: string }) => p.atom === atom);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: agentRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: agentRole.id, permissionId: perm.id },
      });
    }
  }

  // Customer gets only customer portal + dashboard
  const customerAtoms = ['page:dashboard', 'page:customer_portal'];
  for (const atom of customerAtoms) {
    const perm = permissions.find((p: { atom: string }) => p.atom === atom);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: customerRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: customerRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('  ✅ Role permissions assigned');

  // ─── 4. Create Test Users ───────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
  const managerPasswordHash = await bcrypt.hash('Manager@123', 12);
  const agentPasswordHash = await bcrypt.hash('Agent@123', 12);
  const customerPasswordHash = await bcrypt.hash('Customer@123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      roleId: adminRole.id,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      email: 'manager@test.com',
      passwordHash: managerPasswordHash,
      name: 'Manager User',
      roleId: managerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'agent@test.com' },
    update: {},
    create: {
      email: 'agent@test.com',
      passwordHash: agentPasswordHash,
      name: 'Agent User',
      roleId: agentRole.id,
      managerId: managerUser.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      passwordHash: customerPasswordHash,
      name: 'Customer User',
      roleId: customerRole.id,
    },
  });

  console.log('  ✅ Test users created');

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Test Credentials:');
  console.log('  Admin   → admin@test.com    / Admin@123');
  console.log('  Manager → manager@test.com  / Manager@123');
  console.log('  Agent   → agent@test.com    / Agent@123');
  console.log('  Customer→ customer@test.com / Customer@123');

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
