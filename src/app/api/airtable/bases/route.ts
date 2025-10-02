import { NextResponse } from 'next/server';
import { getAirtableBases } from '@/lib/airtable';

export async function GET() {
  try {
    const bases = await getAirtableBases();
    
    return NextResponse.json({ 
      success: true, 
      bases 
    });
  } catch (error) {
    console.error('Error in /api/airtable/bases:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}