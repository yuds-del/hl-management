import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Berhasil keluar sistem!' });
  // Hapus cookie token secara paksa
  response.cookies.delete('hl_token');
  return response;
}