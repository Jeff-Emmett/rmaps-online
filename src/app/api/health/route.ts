import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'rmaps-online',
    version: process.env.npm_package_version || '0.1.0',
  });
}
