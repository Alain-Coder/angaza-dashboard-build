import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Angaza Foundation Dashboard is running',
    port: process.env.PORT || 'Not set'
  })
}