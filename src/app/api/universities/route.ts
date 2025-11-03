import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universities } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const domain = searchParams.get('domain');
    const country = searchParams.get('country');
    const isActiveParam = searchParams.get('isActive');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single university by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const university = await db.select()
        .from(universities)
        .where(eq(universities.id, parseInt(id)))
        .limit(1);

      if (university.length === 0) {
        return NextResponse.json({ 
          error: 'University not found',
          code: "UNIVERSITY_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(university[0], { status: 200 });
    }

    // Single university by domain
    if (domain) {
      const university = await db.select()
        .from(universities)
        .where(eq(universities.domain, domain))
        .limit(1);

      if (university.length === 0) {
        return NextResponse.json({ 
          error: 'University not found',
          code: "UNIVERSITY_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(university[0], { status: 200 });
    }

    // List universities with filters
    let query: any = db.select().from(universities);
    const conditions = [];

    if (country) {
      conditions.push(eq(universities.country, country));
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(universities.isActive, isActive));
    }

    if (search) {
      conditions.push(
        or(
          like(universities.name, `%${search}%`),
          like(universities.country, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(universities.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, country, tenantId, logo, description, isActive, adminIds, settings } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!domain || !domain.trim()) {
      return NextResponse.json({ 
        error: "Domain is required",
        code: "MISSING_DOMAIN" 
      }, { status: 400 });
    }

    if (!country || !country.trim()) {
      return NextResponse.json({ 
        error: "Country is required",
        code: "MISSING_COUNTRY" 
      }, { status: 400 });
    }

    if (!tenantId || !tenantId.trim()) {
      return NextResponse.json({ 
        error: "TenantId is required",
        code: "MISSING_TENANT_ID" 
      }, { status: 400 });
    }

    // Validate domain format (allow multi-level domains like example.edu.in)
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim().toLowerCase())) {
      return NextResponse.json({ 
        error: "Invalid domain format",
        code: "INVALID_DOMAIN_FORMAT" 
      }, { status: 400 });
    }

    // Validate adminIds is array if provided
    if (adminIds !== undefined && !Array.isArray(adminIds)) {
      return NextResponse.json({ 
        error: "adminIds must be an array",
        code: "INVALID_ADMIN_IDS" 
      }, { status: 400 });
    }

    // Validate settings is object if provided
    if (settings !== undefined && (typeof settings !== 'object' || Array.isArray(settings))) {
      return NextResponse.json({ 
        error: "settings must be an object",
        code: "INVALID_SETTINGS" 
      }, { status: 400 });
    }

    // Check if domain already exists
    const existingDomain = await db.select()
      .from(universities)
      .where(eq(universities.domain, domain.trim()))
      .limit(1);

    if (existingDomain.length > 0) {
      return NextResponse.json({ 
        error: "Domain already exists",
        code: "DUPLICATE_DOMAIN" 
      }, { status: 400 });
    }

    // Check if tenantId already exists
    const existingTenantId = await db.select()
      .from(universities)
      .where(eq(universities.tenantId, tenantId.trim()))
      .limit(1);

    if (existingTenantId.length > 0) {
      return NextResponse.json({ 
        error: "TenantId already exists",
        code: "DUPLICATE_TENANT_ID" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newUniversity = await db.insert(universities)
      .values({
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        country: country.trim(),
        tenantId: tenantId.trim(),
        logo: logo?.trim() || null,
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
        adminIds: adminIds || null,
        settings: settings || null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newUniversity[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, domain, country, tenantId, logo, description, isActive, adminIds, settings } = body;

    // Check if university exists
    const existing = await db.select()
      .from(universities)
      .where(eq(universities.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'University not found',
        code: "UNIVERSITY_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate domain format if provided
    if (domain) {
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain.trim().toLowerCase())) {
        return NextResponse.json({ 
          error: "Invalid domain format",
          code: "INVALID_DOMAIN_FORMAT" 
        }, { status: 400 });
      }

      // Check if domain is already used by another university
      const existingDomain = await db.select()
        .from(universities)
        .where(and(
          eq(universities.domain, domain.trim()),
          eq(universities.id, parseInt(id))
        ))
        .limit(1);

      if (existingDomain.length === 0) {
        const domainInUse = await db.select()
          .from(universities)
          .where(eq(universities.domain, domain.trim()))
          .limit(1);

        if (domainInUse.length > 0) {
          return NextResponse.json({ 
            error: "Domain already exists",
            code: "DUPLICATE_DOMAIN" 
          }, { status: 400 });
        }
      }
    }

    // Check if tenantId is already used by another university
    if (tenantId) {
      const existingTenantId = await db.select()
        .from(universities)
        .where(and(
          eq(universities.tenantId, tenantId.trim()),
          eq(universities.id, parseInt(id))
        ))
        .limit(1);

      if (existingTenantId.length === 0) {
        const tenantIdInUse = await db.select()
          .from(universities)
          .where(eq(universities.tenantId, tenantId.trim()))
          .limit(1);

        if (tenantIdInUse.length > 0) {
          return NextResponse.json({ 
            error: "TenantId already exists",
            code: "DUPLICATE_TENANT_ID" 
          }, { status: 400 });
        }
      }
    }

    // Validate adminIds is array if provided
    if (adminIds !== undefined && !Array.isArray(adminIds)) {
      return NextResponse.json({ 
        error: "adminIds must be an array",
        code: "INVALID_ADMIN_IDS" 
      }, { status: 400 });
    }

    // Validate settings is object if provided
    if (settings !== undefined && (typeof settings !== 'object' || Array.isArray(settings))) {
      return NextResponse.json({ 
        error: "settings must be an object",
        code: "INVALID_SETTINGS" 
      }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (domain !== undefined) updates.domain = domain.trim().toLowerCase();
    if (country !== undefined) updates.country = country.trim();
    if (tenantId !== undefined) updates.tenantId = tenantId.trim();
    if (logo !== undefined) updates.logo = logo?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (adminIds !== undefined) updates.adminIds = adminIds;
    if (settings !== undefined) updates.settings = settings;

    const updated = await db.update(universities)
      .set(updates)
      .where(eq(universities.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if university exists
    const existing = await db.select()
      .from(universities)
      .where(eq(universities.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'University not found',
        code: "UNIVERSITY_NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(universities)
      .where(eq(universities.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'University deleted successfully',
      university: deleted[0] 
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}