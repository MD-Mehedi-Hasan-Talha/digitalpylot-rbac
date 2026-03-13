import prisma from '../../config/prisma';

export class PermissionService {
  /**
   * Resolve the effective permission set for a user.
   * 1. Start with the role's default permissions.
   * 2. Apply user-specific overrides (grants & revocations).
   */
  static async resolveUserPermissions(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) throw new Error('User not found');

    // 1. Get role's default permission atoms
    const rolePerms = await prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      include: { permission: true },
    });
    const permSet = new Set(rolePerms.map((rp) => rp.permission.atom));

    // 2. Apply per-user overrides
    const userOverrides = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    for (const override of userOverrides) {
      if (override.granted) {
        permSet.add(override.permission.atom);
      } else {
        permSet.delete(override.permission.atom);
      }
    }

    return Array.from(permSet);
  }

  /**
   * Grant a permission atom to a target user.
   * Enforces the "Grant Ceiling" — a grantor can only grant permissions they hold themselves.
   */
  static async grantPermission(
    grantorId: string,
    targetUserId: string,
    permAtom: string
  ): Promise<void> {
    // 1. Grantor must have 'action:manage_permissions'
    const grantorPerms = await this.resolveUserPermissions(grantorId);
    if (!grantorPerms.includes('action:manage_permissions')) {
      throw new ForbiddenError('No permission management access');
    }

    // 2. Grant ceiling: grantor must hold the permission they're granting
    if (!grantorPerms.includes(permAtom)) {
      throw new ForbiddenError('You cannot grant a permission you do not hold');
    }

    // 3. Find the permission record
    const permission = await prisma.permission.findUnique({
      where: { atom: permAtom },
    });
    if (!permission) throw new NotFoundError('Permission atom not found');

    // 4. Upsert override
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: targetUserId,
          permissionId: permission.id,
        },
      },
      update: {
        granted: true,
        grantedById: grantorId,
        grantedAt: new Date(),
      },
      create: {
        userId: targetUserId,
        permissionId: permission.id,
        granted: true,
        grantedById: grantorId,
      },
    });
  }

  /**
   * Revoke a permission atom from a target user.
   */
  static async revokePermission(
    grantorId: string,
    targetUserId: string,
    permAtom: string
  ): Promise<void> {
    const grantorPerms = await this.resolveUserPermissions(grantorId);
    if (!grantorPerms.includes('action:manage_permissions')) {
      throw new ForbiddenError('No permission management access');
    }

    const permission = await prisma.permission.findUnique({
      where: { atom: permAtom },
    });
    if (!permission) throw new NotFoundError('Permission atom not found');

    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: targetUserId,
          permissionId: permission.id,
        },
      },
      update: {
        granted: false,
        grantedById: grantorId,
        grantedAt: new Date(),
      },
      create: {
        userId: targetUserId,
        permissionId: permission.id,
        granted: false,
        grantedById: grantorId,
      },
    });
  }

  /**
   * Get all available permission atoms.
   */
  static async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: { category: 'asc' },
    });
  }
}

// ─── Custom Error Classes ────────────────────────────────────────────────────
export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
