import { Request, Response, Router } from 'express';
import { authenticate } from '../../middlewares';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';

const router: Router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const result = await AuthService.login(email, password);

    // Set refresh token in httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    await AuditService.log({
      actorId: result.user.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: result.user.id,
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message || 'Login failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token not found' });
      return;
    }

    const result = await AuthService.refresh(refreshToken);

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message || 'Token refresh failed' });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Blacklist the current access token
    const decoded = req.user;
    // Calculate expiry from JWT (iat + expiresIn)
    const tokenPayload = decoded as any;
    const exp = tokenPayload.exp || Math.floor(Date.now() / 1000) + 900; // fallback 15min

    await AuthService.logout(decoded.jti, exp);

    // Clear refresh cookie
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });

    await AuditService.log({
      actorId: decoded.sub,
      action: 'auth.logout',
      targetType: 'user',
      targetId: decoded.sub,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default router;
