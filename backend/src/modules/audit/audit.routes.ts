import { Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middlewares';
import { AuditService } from './audit.service';

const router: Router = Router();

// GET /audit-logs — paginated, filterable
router.get(
  '/',
  authenticate,
  authorize('action:view_audit_log'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const action = req.query.action as string | undefined;
      const actorId = req.query.actorId as string | undefined;

      const result = await AuditService.getAll({ page, limit, action, actorId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  }
);

export default router;
