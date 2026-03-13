import { Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middlewares';
import { AuditService } from '../audit/audit.service';
import { ForbiddenError, NotFoundError } from '../permissions/permission.service';
import { UserService } from './user.service';

const router: Router = Router();

// GET /users — list all users (filtered by role hierarchy)
router.get(
  '/',
  authenticate,
  authorize('page:users'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const roleId = req.query.roleId as string | undefined;

      const result = await UserService.getAll(req.user!.roleLevel, {
        page,
        limit,
        status,
        roleId,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  }
);

// POST /users — create a new user
router.post(
  '/',
  authenticate,
  authorize('action:create_user'),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, roleId, managerId } = req.body;

      if (!email || !password || !name || !roleId) {
        res.status(400).json({
          message: 'email, password, name, and roleId are required',
        });
        return;
      }

      const user = await UserService.create(
        { email, password, name, roleId, managerId },
        req.user!.roleLevel
      );

      await AuditService.log({
        actorId: req.user!.sub,
        action: 'user.created',
        targetType: 'user',
        targetId: user.id,
        metadata: { email, role: user.role.name },
      });

      res.status(201).json({ data: user });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
);

// GET /users/:id — get a single user
router.get(
  '/:id',
  authenticate,
  authorize('page:users'),
  async (req: Request, res: Response) => {
    try {
      const user = await UserService.getById(req.params.id as string);
      res.json({ data: user });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  }
);

// PATCH /users/:id — update a user
router.patch(
  '/:id',
  authenticate,
  authorize('action:edit_user'),
  async (req: Request, res: Response) => {
    try {
      const { email, name, roleId, managerId } = req.body;

      const user = await UserService.update(
        req.params.id as string,
        { email, name, roleId, managerId },
        req.user!.roleLevel
      );

      await AuditService.log({
        actorId: req.user!.sub,
        action: 'user.updated',
        targetType: 'user',
        targetId: req.params.id as string,
        metadata: { email, name, roleId },
      });

      res.json({ data: user });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to update user' });
    }
  }
);

// PATCH /users/:id/status — suspend/ban/activate a user
router.patch(
  '/:id/status',
  authenticate,
  authorize('action:suspend_user'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ message: 'status is required' });
        return;
      }

      const user = await UserService.updateStatus(
        req.params.id as string,
        status as string,
        req.user!.roleLevel
      );

      await AuditService.log({
        actorId: req.user!.sub,
        action: `user.status_changed`,
        targetType: 'user',
        targetId: req.params.id as string,
        metadata: { newStatus: status },
      });

      res.json({ data: user });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Failed to update user status' });
    }
  }
);

export default router;
