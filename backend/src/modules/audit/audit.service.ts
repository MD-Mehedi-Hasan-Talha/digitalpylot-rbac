import prisma from '../../config/prisma';

interface AuditLogParams {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          targetType: params.targetType || null,
          targetId: params.targetId || null,
          metadata: params.metadata as any || null,
        },
      });
    } catch (error) {
      // Audit logging should never break the main flow
      console.error('AuditLog write failed:', error);
    }
  }

  static async getAll(options: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (options.action) where.action = { contains: options.action };
    if (options.actorId) where.actorId = options.actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
