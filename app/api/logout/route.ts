import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  cookies().set('growpesa_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // This deletes the cookie immediately
    path: '/',
  });
  return NextResponse.json({ ok: true });
}