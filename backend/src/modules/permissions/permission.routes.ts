import { Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middlewares';
import { AuditService } from '../audit/audit.service';
import {
    ForbiddenError,
    NotFoundError,
    PermissionService,
} from './permission.service';

const router: Router = Router();

// GET /permissions — list all available permission atoms
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const permissions = await PermissionService.getAllPermissions();
    res.json({ data: permissions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch permissions' });
  }
});

// GET /users/:id/permissions — resolved permission set for a user
router.get(
  '/users/:id',
  authenticate,
  authorize('page:users'),
  async (req: Request, res: Response) => {
    try {
      const permissions = await PermissionService.resolveUserPermissions(
        req.params.id as string
      );
      res.json({ data: permissions });
    } catch (error) {
      res.status(500).json({ message: 'Failed to resolve permissions' });
    }
  }
);

// POST /users/:id/permissions — grant a permission atom
router.post(
  '/users/:id',
  authenticate,
  authorize('action:manage_permissions'),
  async (req: Request, res: Response) => {
    try {
      const { atom } = req.body;
      if (!atom) {
        res.status(400).json({ message: 'Permission atom is required' });
        return;
      }

      await PermissionService.grantPermission(
        req.user!.sub,
        req.params.id as string,
        atom as string
      );

      await AuditService.log({
        actorId: req.user!.sub,
        action: 'permission.granted',
        targetType: 'user',
        targetId: req.params.id as string,
        metadata: { atom },
      });

      res.json({ message: 'Permission granted successfully' });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to grant permission' });
    }
  }
);

// DELETE /users/:id/permissions/:atom — revoke a permission atom
router.delete(
  '/users/:id/:atom',
  authenticate,
  authorize('action:manage_permissions'),
  async (req: Request, res: Response) => {
    try {
      await PermissionService.revokePermission(
        req.user!.sub,
        req.params.id as string,
        req.params.atom as string
      );

      await AuditService.log({
        actorId: req.user!.sub,
        action: 'permission.revoked',
        targetType: 'user',
        targetId: req.params.id as string,
        metadata: { atom: req.params.atom },
      });

      res.json({ message: 'Permission revoked successfully' });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to revoke permission' });
    }
  }
);

export default router;
