import { Next } from 'hono';
import { AppContext } from '../types';
import { getUserIdFromContext } from '../services/authService';

/**
 * Authentication middleware for protecting endpoints
 * Verifies Firebase ID token and adds user ID to context
 */
export async function authMiddleware(c: AppContext, next: Next) {
  const userId = await getUserIdFromContext(c);
  
  if (!userId) {
    return c.json(
      {
        success: false,
        errors: [{ code: 401, message: 'Authentication required' }],
      },
      401
    );
  }
  
  // Add user ID to context for use in handlers
  c.set('userId', userId);
  
  await next();
}

/**
 * Optional authentication middleware
 * Adds user ID to context if authenticated, but doesn't block unauthenticated requests
 */
export async function optionalAuthMiddleware(c: AppContext, next: Next) {
  const userId = await getUserIdFromContext(c);
  
  // Add user ID to context if available (convert null to undefined for type consistency)
  c.set('userId', userId || undefined);
  
  await next();
}

/**
 * Get user ID from context (set by auth middleware)
 * @param c Hono context
 * @returns User ID or null if not set
 */
export function getUserIdFromMiddleware(c: AppContext): string | null {
  return c.get('userId') || null;
}

/**
 * Require authenticated user ID from context
 * @param c Hono context
 * @returns User ID
 * @throws Error if user ID is not available
 */
export function requireUserIdFromMiddleware(c: AppContext): string {
  const userId = c.get('userId');
  
  if (!userId) {
    throw new Error('User ID not available in context. Ensure auth middleware is applied.');
  }
  
  return userId;
}