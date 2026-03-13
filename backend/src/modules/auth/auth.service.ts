import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import prisma from '../../config/prisma';
import { PermissionService } from '../permissions/permission.service';

export class AuthService {
  /**
   * Login — validates credentials and returns access + refresh tokens.
   */
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) throw new Error('Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Invalid email or password');

    if (user.status !== 'active') {
      throw new Error(`Account is ${user.status}`);
    }

    // Resolve permissions for JWT payload
    const permissions = await PermissionService.resolveUserPermissions(user.id);

    const jti = uuidv4();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        roleLevel: user.role.level,
        permissions,
        jti,
      },
      config.jwtSecret!,
      { expiresIn: config.jwtAccessExpiresIn as any }
    );

    const refreshJti = uuidv4();
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: refreshJti,
        type: 'refresh',
      },
      config.jwtRefreshSecret!,
      { expiresIn: config.jwtRefreshExpiresIn as any }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
      },
    };
  }

  /**
   * Refresh — exchange a valid refresh token for a new access token.
   */
  static async refresh(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
      sub: string;
      jti: string;
      type: string;
    };

    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    // Check blacklist
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { jti: decoded.jti },
    });
    if (blacklisted) throw new Error('Refresh token has been revoked');

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    const permissions = await PermissionService.resolveUserPermissions(user.id);
    const jti = uuidv4();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        roleLevel: user.role.level,
        permissions,
        jti,
      },
      config.jwtSecret!,
      { expiresIn: config.jwtAccessExpiresIn as any }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
      },
    };
  }

  /**
   * Logout — blacklist the access token's jti.
   */
  static async logout(jti: string, accessTokenExp: number) {
    await prisma.tokenBlacklist.create({
      data: {
        jti,
        expiresAt: new Date(accessTokenExp * 1000),
      },
    });
  }
}
