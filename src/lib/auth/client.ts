import "server-only";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { authConfigSchema, readConfiguration } from "@/lib/config";

let client: Auth0Client | undefined;

export function isAuthConfigured() {
  return authConfigSchema.safeParse(process.env).success;
}

export function getAuth0() {
  if (client) return client;
  const env = readConfiguration(authConfigSchema, "Authentication");
  client = new Auth0Client({
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    secret: env.AUTH0_SECRET,
    appBaseUrl: env.APP_BASE_URL,
    authorizationParameters: { scope: "openid profile email" },
    enableAccessTokenEndpoint: false,
  });
  return client;
}
