import { NextResponse } from 'next/server';

// Global shared store across server instances for instant cross-device sync
let sharedPool = 6000;
let sharedQueue: any[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    pool: sharedPool,
    queue: sharedQueue,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, item, poolUpdate } = body;

    if (action === 'submit') {
      if (item) {
        const existingIndex = sharedQueue.findIndex((q) => q.id === item.id);
        if (existingIndex >= 0) {
          sharedQueue[existingIndex] = item;
        } else {
          sharedQueue.unshift(item);
        }
      }
    } else if (action === 'approve') {
      if (item) {
        sharedQueue = sharedQueue.map((q) => {
          if (q.id === item.id) {
            return { ...q, status: 'COMPLETED' };
          }
          return q;
        });
      }
      if (poolUpdate !== undefined) {
        sharedPool = poolUpdate;
      }
    } else if (action === 'reject') {
      if (item) {
        sharedQueue = sharedQueue.map((q) => {
          if (q.id === item.id) {
            return { ...q, status: 'REJECTED' };
          }
          return q;
        });
      }
    }

    return NextResponse.json({
      success: true,
      pool: sharedPool,
      queue: sharedQueue,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}