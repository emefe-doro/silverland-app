import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { Role } from "./constants";

export type SessionUser = {
  sub: string;
  role: Role;
  name: string;
  email: string;
  residentId?: string | null;
  officerId?: string | null;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setIssuer("silverland")
    .setAudience("silverland-web")
    .setExpirationTime(Number(process.env.ACCESS_TOKEN_EXPIRE_SECONDS || 28800) + "s")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "silverland",
      audience: "silverland-web",
    });
    return {
      sub: payload.sub!,
      role: payload.role as Role,
      name: payload.name as string,
      email: payload.email as string,
      residentId: (payload.residentId as string | undefined) ?? null,
      officerId: (payload.officerId as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

// Refreshes the on-disk user record for role/resident linkage (authoritative).
export async function loadSessionUser(user: SessionUser): Promise<SessionUser | null> {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    include: {
      resident: { select: { id: true } },
      securityOfficer: { select: { id: true } },
    },
  });
  if (!dbUser || !dbUser.isActive) return null;
  return {
    sub: dbUser.id,
    role: dbUser.role,
    name: dbUser.name,
    email: dbUser.email,
    residentId: dbUser.resident?.id ?? null,
    officerId: dbUser.securityOfficer?.id ?? null,
  };
}
