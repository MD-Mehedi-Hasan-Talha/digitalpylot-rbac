import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config';
import prisma from './config/prisma';

// Route imports
import { authenticate } from './middlewares';
import auditRoutes from './modules/audit/audit.routes';
import authRoutes from './modules/auth/auth.routes';
import permissionRoutes from './modules/permissions/permission.routes';
import { PermissionService } from './modules/permissions/permission.service';
import userRoutes from './modules/users/user.routes';

const app: express.Application = express();

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/audit-logs', auditRoutes);

// GET /api/me — current user + resolved permissions
app.get('/api/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true, level: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const permissions = await PermissionService.resolveUserPermissions(user.id);

    res.json({
      data: {
        ...user,
        permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
});

// GET /api/roles — list all roles (for dropdowns, etc.)
app.get('/api/roles', authenticate, async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { level: 'desc' },
    });
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
});

// ─── 404 Catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
