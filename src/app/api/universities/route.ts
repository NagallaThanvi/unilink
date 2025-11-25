import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'universities';

type University = {
  id?: string;
  name: string;
  domain: string;
  country: string;
  tenantId: string;
  logo?: string | null;
  description?: string | null;
  isActive: boolean;
  adminIds?: string[] | null;
  settings?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

function mapDoc(doc: FirebaseFirestore.DocumentSnapshot): University {
  const data = doc.data() as Omit<University, 'id'> | undefined;
  if (!data) {
    return {
      id: doc.id,
      name: '',
      domain: '',
      country: '',
      tenantId: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return { id: doc.id, ...data };
}

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

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single university by ID (document id)
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json(
          { error: 'University not found', code: 'UNIVERSITY_NOT_FOUND' },
          { status: 404 },
        );
      }
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    // Single university by domain
    if (domain) {
      const snapshot = await collection.where('domain', '==', domain).limit(1).get();
      if (snapshot.empty) {
        return NextResponse.json(
          { error: 'University not found', code: 'UNIVERSITY_NOT_FOUND' },
          { status: 404 },
        );
      }
      const doc = snapshot.docs[0];
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    // List universities with filters (filter mostly in memory for simplicity)
    const snapshot = await collection.get();
    let results = snapshot.docs.map(mapDoc);

    if (country) {
      results = results.filter((u) => u.country === country);
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      results = results.filter((u) => Boolean(u.isActive) === isActive);
    }

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.country.toLowerCase().includes(s),
      );
    }

    // Order by createdAt desc if present
    results.sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });

    const paged = results.slice(offset, offset + limit);

    return NextResponse.json(paged, { status: 200 });
  } catch (error) {
    console.error('GET /api/universities error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, country, tenantId, logo, description, isActive, adminIds, settings } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 },
      );
    }

    if (!domain || !domain.trim()) {
      return NextResponse.json(
        { error: 'Domain is required', code: 'MISSING_DOMAIN' },
        { status: 400 },
      );
    }

    if (!country || !country.trim()) {
      return NextResponse.json(
        { error: 'Country is required', code: 'MISSING_COUNTRY' },
        { status: 400 },
      );
    }

    if (!tenantId || !tenantId.trim()) {
      return NextResponse.json(
        { error: 'TenantId is required', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }

    // Validate domain format (allow multi-level domains like example.edu.in)
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid domain format', code: 'INVALID_DOMAIN_FORMAT' },
        { status: 400 },
      );
    }

    // Validate adminIds is array if provided
    if (adminIds !== undefined && !Array.isArray(adminIds)) {
      return NextResponse.json(
        { error: 'adminIds must be an array', code: 'INVALID_ADMIN_IDS' },
        { status: 400 },
      );
    }

    // Validate settings is object if provided
    if (settings !== undefined && (typeof settings !== 'object' || Array.isArray(settings))) {
      return NextResponse.json(
        { error: 'settings must be an object', code: 'INVALID_SETTINGS' },
        { status: 400 },
      );
    }

    const collection = adminDb.collection(COLLECTION_NAME);

    // Check if domain already exists
    const existingDomainSnap = await collection
      .where('domain', '==', domain.trim().toLowerCase())
      .limit(1)
      .get();
    if (!existingDomainSnap.empty) {
      return NextResponse.json(
        { error: 'Domain already exists', code: 'DUPLICATE_DOMAIN' },
        { status: 400 },
      );
    }

    // Check if tenantId already exists
    const existingTenantSnap = await collection
      .where('tenantId', '==', tenantId.trim())
      .limit(1)
      .get();
    if (!existingTenantSnap.empty) {
      return NextResponse.json(
        { error: 'TenantId already exists', code: 'DUPLICATE_TENANT_ID' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const docRef = collection.doc();
    const payload: University = {
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      country: country.trim(),
      tenantId: tenantId.trim(),
      logo: logo?.trim() || null,
      description: description?.trim() || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      adminIds: adminIds || null,
      settings: settings || null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(payload);
    const created = mapDoc(await docRef.get());

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/universities error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, domain, country, tenantId, logo, description, isActive, adminIds, settings } = body;

    const collection = adminDb.collection(COLLECTION_NAME);
    const docRef = collection.doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json(
        { error: 'University not found', code: 'UNIVERSITY_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Validate domain format if provided
    if (domain) {
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain.trim().toLowerCase())) {
        return NextResponse.json(
          { error: 'Invalid domain format', code: 'INVALID_DOMAIN_FORMAT' },
          { status: 400 },
        );
      }

      // Check if domain is already used by another university
      const existingDomain = await collection
        .where('domain', '==', domain.trim().toLowerCase())
        .limit(5)
        .get();
      const conflict = existingDomain.docs.find((d) => d.id !== id);
      if (conflict) {
        return NextResponse.json(
          { error: 'Domain already exists', code: 'DUPLICATE_DOMAIN' },
          { status: 400 },
        );
      }
    }

    // Check if tenantId is already used by another university
    if (tenantId) {
      const existingTenant = await collection
        .where('tenantId', '==', tenantId.trim())
        .limit(5)
        .get();
      const conflict = existingTenant.docs.find((d) => d.id !== id);
      if (conflict) {
        return NextResponse.json(
          { error: 'TenantId already exists', code: 'DUPLICATE_TENANT_ID' },
          { status: 400 },
        );
      }
    }

    // Validate adminIds is array if provided
    if (adminIds !== undefined && !Array.isArray(adminIds)) {
      return NextResponse.json(
        { error: 'adminIds must be an array', code: 'INVALID_ADMIN_IDS' },
        { status: 400 },
      );
    }

    // Validate settings is object if provided
    if (settings !== undefined && (typeof settings !== 'object' || Array.isArray(settings))) {
      return NextResponse.json(
        { error: 'settings must be an object', code: 'INVALID_SETTINGS' },
        { status: 400 },
      );
    }

    const updates: Partial<University> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (domain !== undefined) updates.domain = domain.trim().toLowerCase();
    if (country !== undefined) updates.country = country.trim();
    if (tenantId !== undefined) updates.tenantId = tenantId.trim();
    if (logo !== undefined) updates.logo = logo?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (adminIds !== undefined) updates.adminIds = adminIds;
    if (settings !== undefined) updates.settings = settings;

    await docRef.set(updates, { merge: true });
    const updated = mapDoc(await docRef.get());

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('PUT /api/universities error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 },
      );
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const docRef = collection.doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: 'University not found', code: 'UNIVERSITY_NOT_FOUND' },
        { status: 404 },
      );
    }

    const existingData = mapDoc(existing);
    await docRef.delete();

    return NextResponse.json(
      { message: 'University deleted successfully', university: existingData },
      { status: 200 },
    );
  } catch (error) {
    console.error('DELETE /api/universities error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 },
    );
  }
}