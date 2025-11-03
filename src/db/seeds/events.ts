import { db } from '@/db';
import { events, user } from '@/db/schema';

async function main() {
    const firstUser = await db.select({ id: user.id }).from(user).limit(1);
    
    if (!firstUser.length) {
        console.error('❌ No users found in database. Please seed users first.');
        return;
    }
    
    const organizerId = firstUser[0].id;
    const now = new Date().toISOString();

    const sampleEvents = [
        {
            title: 'Career Fair 2025',
            description: 'Join us for the largest career fair of the year! Connect with top employers, explore job opportunities, and network with industry professionals. Bring your resume and dress professionally.',
            eventDate: '2025-03-15',
            eventTime: '09:00 AM - 05:00 PM',
            location: 'University Convention Center, Main Hall',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 500,
            currentAttendees: 245,
            imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['career', 'networking', 'jobs', 'professional']),
            registrationDeadline: '2025-03-10T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Alumni Meetup - Tech Industry',
            description: 'Exclusive networking event for tech professionals in the alumni network. Share experiences, discuss industry trends, and build meaningful connections over dinner.',
            eventDate: '2025-02-20',
            eventTime: '06:00 PM - 09:00 PM',
            location: 'TechHub Downtown, Conference Room A',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 50,
            currentAttendees: 38,
            imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['tech', 'networking', 'alumni', 'dinner']),
            registrationDeadline: '2025-02-18T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Webinar: Career Development Tips',
            description: 'Online seminar featuring industry experts sharing insights on career growth, skill development, and professional advancement. Perfect for early-career professionals.',
            eventDate: '2025-02-25',
            eventTime: '02:00 PM - 04:00 PM',
            location: 'Online via Zoom',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 200,
            currentAttendees: 156,
            imageUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['webinar', 'career', 'online', 'professional-development']),
            registrationDeadline: '2025-02-24T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Annual Homecoming Gala',
            description: 'Celebrate with fellow alumni at our prestigious annual gala. Enjoy an evening of fine dining, entertainment, and reconnecting with old friends. Black-tie optional.',
            eventDate: '2025-04-12',
            eventTime: '07:00 PM - 11:00 PM',
            location: 'Grand Hotel Ballroom',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 300,
            currentAttendees: 178,
            imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['gala', 'homecoming', 'formal', 'celebration']),
            registrationDeadline: '2025-04-05T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Startup Pitch Competition',
            description: 'Alumni entrepreneurs presented their innovative startups to a panel of investors. Amazing pitches and great networking opportunities throughout the day.',
            eventDate: '2024-11-15',
            eventTime: '10:00 AM - 06:00 PM',
            location: 'Innovation Hub, Auditorium',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 150,
            currentAttendees: 100,
            imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
            status: 'completed',
            tags: JSON.stringify(['startup', 'entrepreneurship', 'pitch', 'innovation']),
            registrationDeadline: null,
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Networking Night - Finance Professionals',
            description: 'Connect with finance and investment professionals from the alumni network. Discuss market trends, career opportunities, and share insights in a casual setting.',
            eventDate: '2025-03-05',
            eventTime: '06:30 PM - 09:30 PM',
            location: 'Skybar Financial District',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 75,
            currentAttendees: 52,
            imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['finance', 'networking', 'professionals', 'evening']),
            registrationDeadline: '2025-03-03T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Guest Lecture: AI in Healthcare',
            description: 'Distinguished alumnus Dr. Sarah Chen shares cutting-edge insights on artificial intelligence applications in healthcare. Open to all interested alumni and students.',
            eventDate: '2025-03-20',
            eventTime: '03:00 PM - 05:00 PM',
            location: 'University Medical Center, Lecture Hall 3',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: null,
            currentAttendees: 89,
            imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['lecture', 'AI', 'healthcare', 'technology']),
            registrationDeadline: '2025-03-19T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
        {
            title: 'Sports Alumni Reunion',
            description: 'Former varsity athletes reunite for a day of sports, friendly competition, and reminiscing. Includes lunch, games, and awards ceremony. All sports teams welcome!',
            eventDate: '2025-05-10',
            eventTime: '10:00 AM - 04:00 PM',
            location: 'University Sports Complex',
            universityId: 1,
            organizerId: organizerId,
            maxAttendees: 150,
            currentAttendees: 67,
            imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
            status: 'upcoming',
            tags: JSON.stringify(['sports', 'reunion', 'athletics', 'alumni']),
            registrationDeadline: '2025-05-05T23:59:59.000Z',
            isPublic: true,
            createdAt: now,
            updatedAt: now,
        },
    ];

    await db.insert(events).values(sampleEvents);
    
    console.log('✅ Events seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});