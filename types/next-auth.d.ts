import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationId?: string | null;
    roles?: string[];
    permissions?: string[];
  }

  interface Session {
    user: User & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationId?: string | null;
    roles?: string[];
    permissions?: string[];
  }
}
