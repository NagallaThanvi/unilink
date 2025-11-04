import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { 
  getJobRecommendations, 
  getMentorRecommendations, 
  getConnectionRecommendations 
} from '@/lib/ai-matching-simple';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'jobs', 'mentors', 'connections'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!type) {
      return NextResponse.json({ 
        error: 'Recommendation type is required. Use: jobs, mentors, or connections',
        code: 'MISSING_TYPE' 
      }, { status: 400 });
    }

    let recommendations = [];

    switch (type) {
      case 'jobs':
        recommendations = await getJobRecommendations(user.id, limit);
        break;
      case 'mentors':
        recommendations = await getMentorRecommendations(user.id, limit);
        break;
      case 'connections':
        recommendations = await getConnectionRecommendations(user.id, limit);
        break;
      default:
        return NextResponse.json({ 
          error: 'Invalid recommendation type. Use: jobs, mentors, or connections',
          code: 'INVALID_TYPE' 
        }, { status: 400 });
    }

    return NextResponse.json({
      type,
      userId: user.id,
      recommendations,
      count: recommendations.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET recommendations error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
