declare module "@clerk/nextjs" {
  import type { ComponentType, ReactNode } from "react";

  export const ClerkProvider: ComponentType<{ children: ReactNode }>;
  export const SignedIn: ComponentType<{ children: ReactNode }>;
  export const SignedOut: ComponentType<{ children: ReactNode }>;
  export const SignInButton: ComponentType<{ children?: ReactNode; mode?: "modal" | "redirect" }>;
  export const UserButton: ComponentType<{ afterSignOutUrl?: string }>;
}

declare module "@clerk/nextjs/server" {
  import type { NextRequest } from "next/server";

  type AuthObject = {
    userId: string | null;
    protect: () => Promise<void>;
  };

  type AuthCallback = (auth: AuthObject, request: NextRequest) => void | Promise<void>;

  export function auth(): Promise<AuthObject>;
  export function clerkMiddleware(callback?: AuthCallback): (request: NextRequest) => Promise<void> | void;
  export function createRouteMatcher(routes: string[]): (request: NextRequest) => boolean;
}

declare module "@supabase/supabase-js" {
  type QueryResult<T = unknown> = Promise<{ data: T; error: { message: string } | null }>;
  type QueryBuilder<T = unknown> = {
    select: (columns?: string) => QueryBuilder<T>;
    insert: (values: unknown) => QueryBuilder<T>;
    update: (values: unknown) => QueryBuilder<T>;
    delete: () => QueryBuilder<T>;
    eq: (column: string, value: unknown) => QueryBuilder<T>;
    order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
    single: () => QueryResult<T>;
    then: Promise<{ data: T; error: { message: string } | null }>["then"];
  };
  type SupabaseClient<TDatabase = unknown> = {
    readonly __database?: TDatabase;
    from: <TRow = unknown>(table: string) => QueryBuilder<TRow>;
  };

  export function createClient<TDatabase = unknown>(
    url: string,
    key: string,
    options?: unknown,
  ): SupabaseClient<TDatabase>;
}

declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(options: unknown);
    send(command: unknown): Promise<unknown>;
  }

  export class PutObjectCommand {
    constructor(options: unknown);
  }

  export class DeleteObjectCommand {
    constructor(options: unknown);
  }
}
