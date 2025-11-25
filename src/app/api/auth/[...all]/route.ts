import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Auth is handled by Firebase client SDK.' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Auth is handled by Firebase client SDK.' }, { status: 404 });
}