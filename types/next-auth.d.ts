import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string | null;
      name?: string | null;
      lastname?: string | null;
      phone?: string | null;
      address?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string | null;
    name?: string | null;
    lastname?: string | null;
    phone?: string | null;
    address?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    name?: string | null;
    lastname?: string | null;
    phone?: string | null;
    address?: string | null;
  }
}
