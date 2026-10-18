import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function createSession(memberId: number) {
  const token = await new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);
  
  cookies().set('growpesa_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30, path: '/' });
}

export async function getSession() {
  const token = cookies().get('growpesa_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.memberId as number;
  } catch {
    return null;
  }
}