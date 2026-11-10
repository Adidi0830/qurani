import { NextResponse } from 'next/server';
import { fetchSettingGlobal } from '@/utils/api/setting global/fetch';

export async function GET() {
  const data = await fetchSettingGlobal();
  return NextResponse.json(data);
}
