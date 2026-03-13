import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../permissions/permission.service';

interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  roleId: string;
  managerId?: string;
}

interface UpdateUserDto {
  email?: string;
  name?: string;
  roleId?: string;
  managerId?: string | null;
}

export class UserService {
  /**
   * Get all users — filtered by role hierarchy.
   * A user can only see users with a role level lower than or equal to their own.
   */
  static async getAll(
    requestorRoleLevel: number,
    options: { page?: number; limit?: number; status?: string; roleId?: string }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Filter by role hierarchy: only see users at or below your level
    where.role = { level: { lte: requestorRoleLevel } };

    if (options.status) where.status = options.status;
    if (options.roleId) where.roleId = options.roleId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { id: true, name: true, level: true } },
          manager: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single user by ID.
   */
  static async getById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true, level: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Create a new user.
   * Enforces role hierarchy: you can only create users at a lower level.
   */
  static async create(dto: CreateUserDto, creatorRoleLevel: number) {
    // Check target role level
    const targetRole = await prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!targetRole) throw new NotFoundError('Role not found');

    if (targetRole.level >= creatorRoleLevel) {
      throw new ForbiddenError('Cannot create a user with equal or higher role');
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ForbiddenError('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        roleId: dto.roleId,
        managerId: dto.managerId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true, level: true } },
      },
    });

    return user;
  }

  /**
   * Update a user's profile fields.
   */
  static async update(userId: string, dto: UpdateUserDto, updaterRoleLevel: number) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!targetUser) throw new NotFoundError('User not found');

    // Cannot edit users at or above your level (unless editing self)
    if (targetUser.role.level >= updaterRoleLevel) {
      throw new ForbiddenError('Cannot edit a user with equal or higher role');
    }

    // If changing role, validate new role level
    if (dto.roleId) {
      const newRole = await prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!newRole) throw new NotFoundError('Role not found');
      if (newRole.level >= updaterRoleLevel) {
        throw new ForbiddenError('Cannot assign a role equal to or higher than yours');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email && { email: dto.email }),
        ...(dto.name && { name: dto.name }),
        ...(dto.roleId && { roleId: dto.roleId }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
        role: { select: { id: true, name: true, level: true } },
      },
    });

    return user;
  }

  /**
   * Update a user's status (active, suspended, banned).
   */
  static async updateStatus(
    userId: string,
    status: string,
    updaterRoleLevel: number
  ) {
    const validStatuses = ['active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      throw new ForbiddenError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!targetUser) throw new NotFoundError('User not found');

    if (targetUser.role.level >= updaterRoleLevel) {
      throw new ForbiddenError('Cannot change status of a user with equal or higher role');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    return updated;
  }
}
