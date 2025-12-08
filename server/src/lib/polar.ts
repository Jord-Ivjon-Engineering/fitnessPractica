import { Polar } from "@polar-sh/sdk";

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error("POLAR_ACCESS_TOKEN environment variable is required");
}

// Validate token format
// Polar supports multiple token formats:
// - polar_at_xxxxx (Customer Access Token)
// - polar_oat_xxxxx (Organization Access Token - full format)
// - oat_xxxxx (Organization Access Token - short format)
const token = process.env.POLAR_ACCESS_TOKEN.trim();

// Log token info (first 10 chars only for security) for debugging
const tokenPreview = token.length > 10 ? token.substring(0, 10) + '...' : token;
console.log(`🔑 Polar token loaded: ${tokenPreview} (length: ${token.length})`);

// Accept all valid Polar token formats
const isValidFormat = 
  token.startsWith('polar_at_') ||   // Customer Access Token
  token.startsWith('polar_oat_') ||  // Organization Access Token (full)
  token.startsWith('oat_');           // Organization Access Token (short)

if (!isValidFormat) {
  console.error('❌ ERROR: POLAR_ACCESS_TOKEN does not match expected format!');
  console.error(`   Expected formats: polar_at_xxxxx, polar_oat_xxxxx, or oat_xxxxx`);
  console.error(`   Actual token starts with: ${token.substring(0, Math.min(20, token.length))}`);
  console.error(`   Token length: ${token.length}`);
  console.error('   Please check your .env file and ensure the token is correct.');
  throw new Error('POLAR_ACCESS_TOKEN format is invalid. Token must start with "polar_at_", "polar_oat_", or "oat_"');
}

// Determine server environment (sandbox or production)
// Default to production if not specified
const serverEnv = (process.env.POLAR_SERVER || 'production').toLowerCase();
const validEnvironments = ['sandbox', 'production'];
if (!validEnvironments.includes(serverEnv)) {
  console.warn(`⚠️  Warning: POLAR_SERVER="${serverEnv}" is invalid. Using "production" instead.`);
  console.warn(`   Valid values: "sandbox" or "production"`);
}

const polarConfig: {
  accessToken: string;
  server?: 'sandbox' | 'production';
} = {
  accessToken: token,
};

// Only set server if explicitly configured (defaults to production)
if (serverEnv === 'sandbox') {
  polarConfig.server = 'sandbox';
  console.log('🔧 Polar SDK configured for SANDBOX environment');
} else {
  polarConfig.server = 'production';
  console.log('🔧 Polar SDK configured for PRODUCTION environment');
}

export const polar = new Polar(polarConfig);

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

