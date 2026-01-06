import { Request } from 'express';

/**
 * Get the frontend URL from the request origin, always redirecting www to non-www
 * Falls back to environment variables if origin is not available
 * 
 * This function ensures that all redirect URLs use fitnesspractica.com (without www)
 * to maintain consistency with the Telegram bot domain requirement.
 * 
 * @param req - Express request object
 * @returns The frontend URL to use for redirects (always non-www)
 */
export function getFrontendUrl(req: Request): string {
  // Try to get the origin from the request headers (preferred)
  const origin = req.headers.origin;
  
  // If no origin header, try referer header
  const referer = origin || req.headers.referer;
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const hostname = refererUrl.hostname.toLowerCase();
      
      // Check if it's one of our allowed domains (with or without www)
      if (hostname === 'fitnesspractica.com' || hostname === 'www.fitnesspractica.com') {
        // Always use non-www version for consistency with Telegram bot
        const protocol = hostname.includes('localhost') || hostname.includes('127.0.0.1') 
          ? refererUrl.protocol 
          : 'https:';
        return `${protocol}//fitnesspractica.com`;
      }
      
      // For localhost/development, use as-is
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return `${refererUrl.protocol}//${hostname}${refererUrl.port ? `:${refererUrl.port}` : ''}`;
      }
    } catch (error) {
      // Invalid URL, fall through to environment variables
      console.warn('Invalid origin/referer URL:', referer);
    }
  }
  
  // Fall back to environment variables
  const envUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (envUrl) {
    try {
      const envUrlObj = new URL(envUrl);
      const hostname = envUrlObj.hostname.toLowerCase();
      
      // For production domains, always use non-www version
      if (hostname === 'fitnesspractica.com' || hostname === 'www.fitnesspractica.com') {
        return 'https://fitnesspractica.com';
      }
      
      return envUrl;
    } catch (error) {
      // Invalid URL in env, fall through to default
      console.warn('Invalid FRONTEND_URL/CLIENT_URL:', envUrl);
    }
  }
  
  // Default to localhost for development
  return 'http://localhost:5173';
}

