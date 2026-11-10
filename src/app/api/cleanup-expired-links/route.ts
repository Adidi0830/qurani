import { NextResponse } from 'next/server';
import { cleanupExpiredLinks } from '@/utils/api/grup/invitation-links';

export async function POST() {
  try {
    // Optional: Add authentication check
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const result = await cleanupExpiredLinks();
    
    if (result.status === 'success') {
      return NextResponse.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in cleanup API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}