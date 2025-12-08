import { Polar } from "@polar-sh/sdk";

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error("POLAR_ACCESS_TOKEN environment variable is required");
}

// Validate token format (Polar tokens typically start with 'polar_at_')
const token = process.env.POLAR_ACCESS_TOKEN.trim();
if (!token.startsWith('polar_at_')) {
  console.warn('⚠️  Warning: POLAR_ACCESS_TOKEN does not match expected format (should start with "polar_at_")');
}

export const polar = new Polar({
  accessToken: token,
});

// Helper function to check if error is authentication-related
export function isPolarAuthError(error: any): boolean {
  return error?.statusCode === 401 || 
         error?.status === 401 || 
         error?.body?.error === 'invalid_token' ||
         error?.message?.includes('invalid_token') ||
         error?.message?.includes('expired') ||
         error?.message?.includes('revoked');
}

// Helper function to get user-friendly error message for auth errors
export function getPolarAuthErrorMessage(error: any): string {
  const errorBody = typeof error?.body === 'string' 
    ? JSON.parse(error.body) 
    : error?.body;
  
  const description = errorBody?.error_description || 
                     errorBody?.error || 
                     'The access token provided is expired, revoked, malformed, or invalid for other reasons.';
  
  return `Polar API authentication failed: ${description}. ` +
         `Please generate a new access token from https://polar.sh/settings/tokens ` +
         `and update the POLAR_ACCESS_TOKEN environment variable in your server configuration.`;
}

