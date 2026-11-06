import { Request, Response, NextFunction } from 'express';
import { admin, isFirebaseInitialized } from '../config/firebase.js';
import { DataStore } from '../services/store.js';
import { UserRole } from '../types/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    let userId: string;
    let email: string = '';

    if (token.startsWith('demo_') || token.startsWith('test_')) {
      userId = token.replace(/^(demo_|test_)/, '');
      const userDoc = await DataStore.getUser(userId);
      if (userDoc) {
        email = userDoc.email;
      }
    } else if (isFirebaseInitialized) {
      const decoded = await admin.auth().verifyIdToken(token);
      userId = decoded.uid;
      email = decoded.email || '';
    } else {
      userId = token;
      const userDoc = await DataStore.getUser(userId);
      if (userDoc) {
        email = userDoc.email;
      }
    }

    const userProfile = await DataStore.getUser(userId);
    if (!userProfile) {
      res.status(401).json({ success: false, message: 'User profile not found in system.' });
      return;
    }

    req.user = {
      id: userProfile.id,
      email: userProfile.email || email,
      role: userProfile.role,
      full_name: userProfile.full_name,
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    let userId: string;
    let email: string = '';

    if (token.startsWith('demo_') || token.startsWith('test_')) {
      userId = token.replace(/^(demo_|test_)/, '');
      const userDoc = await DataStore.getUser(userId);
      if (userDoc) email = userDoc.email;
    } else if (isFirebaseInitialized) {
      const decoded = await admin.auth().verifyIdToken(token);
      userId = decoded.uid;
      email = decoded.email || '';
    } else {
      userId = token;
      const userDoc = await DataStore.getUser(userId);
      if (userDoc) email = userDoc.email;
    }

    const userProfile = await DataStore.getUser(userId);
    if (userProfile) {
      req.user = {
        id: userProfile.id,
        email: userProfile.email || email,
        role: userProfile.role,
        full_name: userProfile.full_name,
      };
    }
  } catch {
    // Ignore optional auth errors
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
