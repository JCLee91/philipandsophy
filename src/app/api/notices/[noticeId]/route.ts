import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/types/database';

const SESSION_HEADER = 'x-session-token';

async function resolveSession(sessionToken: string | null) {
  if (!sessionToken) {
    return null;
  }

  const snapshot = await adminDb
    .collection(COLLECTIONS.PARTICIPANTS)
    .where('sessionToken', '==', sessionToken)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as any;

  const sessionExpiry = typeof data.sessionExpiry === 'number' ? data.sessionExpiry : null;
  if (sessionExpiry && sessionExpiry < Date.now()) {
    return null;
  }

  return {
    id: doc.id,
    isAdmin: data.isAdmin === true,
  };
}

export async function DELETE(request: NextRequest, { params }: { params: { noticeId: string } }) {
  try {
    const sessionToken = request.headers.get(SESSION_HEADER) ?? request.cookies.get('pns-session')?.value ?? null;
    const session = await resolveSession(sessionToken);

    if (!session) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!session.isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const noticeId = params.noticeId;
    if (!noticeId) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    await adminDb.collection(COLLECTIONS.NOTICES).doc(noticeId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete notice', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
