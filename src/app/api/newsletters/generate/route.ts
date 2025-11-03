import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletters } from '@/db/schema';

function generateTitle(): string {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();
  return `Newsletter for ${month} ${year}`;
}

function generateMockContent(aiPrompt: string): string {
  return `Dear Alumni,

We are excited to share the latest updates from our university community.

[Based on prompt: ${aiPrompt}]

This newsletter includes recent achievements, upcoming events, and stories from our alumni network. Stay connected and engaged with your alma mater.

Best regards,
University Communications Team`;
}

function generateHtmlContent(content: string): string {
  const paragraphs = content.split('\n\n').map(p => `<p>${p}</p>`).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    p { margin-bottom: 15px; }
  </style>
</head>
<body>
  ${paragraphs}
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, createdBy, aiPrompt, title } = body;

    // Validate required fields
    if (!universityId) {
      return NextResponse.json(
        {
          error: 'universityId is required',
          code: 'MISSING_UNIVERSITY_ID'
        },
        { status: 400 }
      );
    }

    if (!createdBy) {
      return NextResponse.json(
        {
          error: 'createdBy is required',
          code: 'MISSING_CREATED_BY'
        },
        { status: 400 }
      );
    }

    if (!aiPrompt) {
      return NextResponse.json(
        {
          error: 'aiPrompt is required',
          code: 'MISSING_AI_PROMPT'
        },
        { status: 400 }
      );
    }

    // Validate universityId is a valid integer
    const parsedUniversityId = parseInt(universityId);
    if (isNaN(parsedUniversityId)) {
      return NextResponse.json(
        {
          error: 'universityId must be a valid integer',
          code: 'INVALID_UNIVERSITY_ID'
        },
        { status: 400 }
      );
    }

    // Generate newsletter content
    const newsletterTitle = title || generateTitle();
    const content = generateMockContent(aiPrompt.trim());
    const htmlContent = generateHtmlContent(content);

    // Create newsletter with all required fields
    const now = new Date().toISOString();
    const newNewsletter = await db.insert(newsletters)
      .values({
        universityId: parsedUniversityId,
        createdBy: createdBy.trim(),
        title: newsletterTitle.trim(),
        content: content,
        htmlContent: htmlContent,
        aiPrompt: aiPrompt.trim(),
        status: 'draft',
        recipientCount: 0,
        openRate: 0,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    if (newNewsletter.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to create newsletter',
          code: 'CREATION_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Newsletter generated successfully',
        newsletter: newNewsletter[0]
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}