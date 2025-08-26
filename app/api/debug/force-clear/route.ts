import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

export async function GET() {
  try {
    console.log('🗑️ Force clearing all tokens from database...');
    
    const defaultUser = await DatabaseService.getDefaultUser();
    if (defaultUser) {
      const result = await DatabaseService.deleteClioToken(defaultUser.id);
      console.log('Token deletion result:', result);
      
      return NextResponse.json({
        success: true,
        message: 'All tokens cleared from database',
        userId: defaultUser.id
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No default user found'
      });
    }
    
  } catch (error) {
    console.error('Force clear error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🗑️ Force clearing all tokens from database...');
    
    const defaultUser = await DatabaseService.getDefaultUser();
    if (defaultUser) {
      const result = await DatabaseService.deleteClioToken(defaultUser.id);
      console.log('Token deletion result:', result);
      
      return NextResponse.json({
        success: true,
        message: 'All tokens cleared from database',
        userId: defaultUser.id
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No default user found'
      });
    }
    
  } catch (error) {
    console.error('Force clear error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
