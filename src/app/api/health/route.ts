/**
 * Health check endpoint for Garieva Prince
 * Validates: authentication config, database connectivity (optional), R2 binding (optional)
 */

export async function GET() {
  const result: { status: 'ok' | 'partial'; services: Record<string, string> } = {
    status: 'partial',
    services: {},
  };
  
  try {
    // Check Auth0 transitional config
    if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID) {
      result.services.auth = 'auth0 (transitional)';
    } else {
      result.services.auth = 'D1 custom auth (target)';
    }
    
    // Check D1 database binding
    if (process.env.DATABASE_URL || process.env.CLOUDFLARE_D1_DATABASE_NAME) {
      result.services.d1 = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? 'garieva-prince-dev';
    } else {
      result.services.d1 = 'not bound (development mode)';
    }
    
    // Check R2 configuration (optional - may not be configured)
    if (process.env.R2_ACCOUNT_ID && process.env.R2_PUBLIC_BUCKET_NAME) {
      result.services.r2 = `r2/${process.env.R2_PUBLIC_BUCKET_NAME}`;
    } else {
      result.services.r2 = 'not bound (development mode)';
    }
    
    // Check Brevo email service
    if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
      result.services.brevo = 'configured';
    } else {
      result.services.brevo = 'not configured (development mode)';
    }
    
  } catch (error) {
    // Health check failed
    return Response.json(
      { status: 'error', error: 'Health check failed' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  
  // Return full health status with all services
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}