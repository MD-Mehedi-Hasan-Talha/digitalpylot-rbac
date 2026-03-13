import { NextFunction, Request, Response } from 'express';

/**
 * Authorization middleware — checks that the authenticated user
 * holds every one of the required permission atoms.
 *
 * Usage:  router.get('/users', authenticate, authorize('page:users'), handler)
 */
export const authorize = (...requiredAtoms: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const userPermissions = req.user.permissions || [];

    const hasAll = requiredAtoms.every((atom) => userPermissions.includes(atom));

    if (!hasAll) {
      res.status(403).json({
        message: 'You do not have permission to perform this action',
        required: requiredAtoms,
      });
      return;
    }

    next();
  };
};
