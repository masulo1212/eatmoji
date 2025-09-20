import { AppContext } from '../types';

/**
 * Validate Firebase ID token and extract user ID
 * 
 * NOTE: This is a simplified implementation for development.
 * In production, you should use proper JWT verification with Firebase's public keys
 * or the Firebase Admin SDK for complete security.
 * 
 * @param idToken Firebase ID token
 * @param env Environment variables (for future use with proper verification)
 * @returns User ID if token is valid, null otherwise
 */
export async function validateFirebaseToken(idToken: string, env: any): Promise<string | null> {
  try {
    // Basic validation - check if token has proper JWT format
    if (!idToken || !idToken.startsWith('eyJ')) {
      return null;
    }
    
    // Split JWT into parts
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Extract payload from JWT (basic implementation)
    const payload = JSON.parse(atob(parts[1]));
    
    // Basic validation - check if token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn('Token expired');
      return null;
    }
    
    // Check if token was issued in the future (basic security check)
    if (payload.iat && payload.iat > now + 60) { // Allow 1 minute clock skew
      console.warn('Token issued in the future');
      return null;
    }
    
    // Extract user ID from token
    const userId = payload.sub || payload.user_id || payload.uid;
    
    if (!userId) {
      console.warn('No user ID found in token');
      return null;
    }
    
    return userId;
  } catch (error) {
    console.error('Error validating Firebase token:', error);
    return null;
  }
}

/**
 * Extract user ID from Authorization header in Hono context
 * @param c Hono context
 * @returns User ID if authentication is successful, null otherwise
 */
export async function getUserIdFromContext(c: AppContext): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  return await validateFirebaseToken(token, c.env);
}

/**
 * Check if user is authenticated
 * @param c Hono context
 * @returns boolean indicating if user is authenticated
 */
export async function isAuthenticated(c: AppContext): Promise<boolean> {
  const userId = await getUserIdFromContext(c);
  return userId !== null;
}

/**
 * Get authenticated user ID or throw error
 * Convenience function for endpoints that require authentication
 * @param c Hono context
 * @returns User ID
 * @throws Error if user is not authenticated
 */
export async function requireAuth(c: AppContext): Promise<string> {
  const userId = await getUserIdFromContext(c);
  
  if (!userId) {
    throw new Error('Authentication required');
  }
  
  return userId;
}

/**
 * Extract Bearer token from Authorization header
 * @param c Hono context
 * @returns Token string or null if not found
 */
export function extractBearerToken(c: AppContext): string | null {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}