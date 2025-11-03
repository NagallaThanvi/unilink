# UniLink - KLH Alumni Networking Platform

<div align="center">

🎓 **Exclusively for KLH (KLE Technological University) Community**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Polygon](https://img.shields.io/badge/Blockchain-Polygon-purple)](https://polygon.technology/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**100% Free Forever** | **Blockchain Verified** | **E2E Encrypted** | **AI-Powered**

</div>

---

## 🌟 Overview

UniLink is a next-generation alumni networking platform exclusively designed for **KLH (KLE Technological University)** students and alumni. Built with cutting-edge technologies including blockchain verification, end-to-end encryption, and AI-powered insights.

### ✨ Key Features

- 🔐 **Blockchain Credential Verification** - Immutable academic credentials on Polygon blockchain
- 💬 **Encrypted Messaging** - End-to-end encrypted chat with complete privacy
- 🤖 **AI Newsletter Generation** - Personalized content powered by OpenAI
- 👥 **Alumni-Student Network** - Connect, mentor, and grow together
- 🎯 **KLH Exclusive** - Restricted to official KLH email addresses only
- 🆓 **100% Free** - No subscriptions, no hidden costs, completely free forever

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/UI
- **Animation**: Framer Motion

### Backend
- **Database**: Turso (SQLite) with Drizzle ORM
- **Authentication**: Better-Auth with OAuth (Google/LinkedIn)
- **API**: Next.js API Routes

### Blockchain
- **Network**: Polygon (MATIC)
- **Smart Contracts**: Solidity
- **Integration**: ethers.js

### AI & Services
- **AI**: OpenAI API (GPT-4)
- **Encryption**: OpenPGP.js
- **Deployment**: AWS Cloud

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- KLH email address (@klh.edu.in, @kletech.ac.in, or @kle.edu.in)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/unilink.git
cd unilink
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Required environment variables:
```env
# Database (Turso)
TURSO_DATABASE_URL=your_turso_db_url
TURSO_AUTH_TOKEN=your_turso_auth_token

# Authentication
BETTER_AUTH_SECRET=your_secret_key
BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: For full functionality
OPENAI_API_KEY=your_openai_api_key
POLYGON_RPC_URL=https://polygon-rpc.com
CREDENTIAL_CONTRACT_ADDRESS=your_contract_address
```

4. **Run database migrations**
```bash
npm run db:push
```

5. **Seed the database (optional)**
```bash
npm run db:seed
```

6. **Start development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

---

## 📁 Project Structure

```
unilink/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── sign-in/           # Authentication pages
│   │   ├── sign-up/
│   │   ├── dashboard/         # User dashboard
│   │   ├── admin/             # Admin panel
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── Navigation.tsx
│   ├── db/                    # Database
│   │   ├── schema.ts         # Database schema
│   │   ├── index.ts          # Database connection
│   │   └── seeds/            # Seed data
│   ├── lib/                   # Utilities
│   │   ├── auth.ts           # Authentication config
│   │   ├── auth-client.ts    # Auth client
│   │   └── utils.ts
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
├── BLOCKCHAIN.md              # Blockchain documentation
├── SECURITY.md                # Security & E2EE guide
└── README.md                  # This file
```

---

## 🔒 Security Features

### End-to-End Encryption (E2EE)
- All messages encrypted with RSA-4096
- Keys generated client-side
- Server cannot decrypt messages
- See [SECURITY.md](SECURITY.md) for details

### GDPR Compliance
- Right to access data
- Right to erasure (data deletion)
- Data portability
- Consent management
- Multi-tenant data isolation

### Authentication
- OAuth 2.0 with Google/LinkedIn
- JWT-based sessions
- KLH email validation
- Role-based access control

---

## ⛓️ Blockchain Integration

### Credential Verification
- Academic credentials stored on Polygon blockchain
- Tamper-proof and instantly verifiable
- Smart contract-based issuance
- See [BLOCKCHAIN.md](BLOCKCHAIN.md) for implementation

### Benefits
- **Immutable Records**: Cannot be altered once issued
- **Instant Verification**: Real-time credential checking
- **Cost-Effective**: Low transaction fees on Polygon
- **Transparent**: Public verification without exposing private data

---

## 🎯 Features Deep Dive

### 1. User Dashboard
- **Profile Management**: Create and update alumni/student profiles
- **Network Directory**: Browse and connect with KLH alumni
- **Credentials**: View and share verified academic credentials
- **Messaging**: Secure E2E encrypted conversations
- **Connections**: Manage alumni-student relationships

### 2. Admin Panel
- **University Management**: Add and manage universities
- **User Management**: Moderate users and profiles
- **Newsletter Generation**: AI-powered newsletter creation with OpenAI
- **Analytics**: Platform usage and engagement metrics

### 3. Authentication
- **Sign Up**: Restricted to KLH email addresses
- **Sign In**: Email/password with remember me
- **OAuth**: Google and LinkedIn integration
- **Session Management**: Secure JWT-based sessions

### 4. AI Newsletter
- **Content Generation**: Powered by OpenAI GPT-4
- **Personalization**: Tailored to user interests
- **Scheduling**: Automated delivery
- **Analytics**: Track engagement

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/[...all]` - Better-auth endpoints

### User Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/[id]` - Get profile by ID
- `POST /api/profiles` - Create profile
- `PUT /api/profiles/[id]` - Update profile

### Credentials
- `GET /api/credentials` - Get user credentials
- `POST /api/credentials` - Issue credential
- `POST /api/credentials/verify` - Verify blockchain credential

### Messages
- `GET /api/messages` - Get user messages
- `POST /api/messages` - Send encrypted message
- `GET /api/messages/conversations` - Get conversations

### Connections
- `GET /api/connections` - Get connections
- `POST /api/connections/request` - Send connection request

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/newsletters/generate` - Generate AI newsletter

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Test Accounts
```
Email: test.alumni@klh.edu.in
Password: TestPassword123

Email: test.student@klh.edu.in
Password: TestPassword123
```

---

## 🚢 Deployment

### AWS Deployment

1. **Setup AWS Account**
2. **Configure AWS CLI**
```bash
aws configure
```

3. **Deploy to AWS Amplify**
```bash
npm run deploy:aws
```

### CI/CD Pipeline

GitHub Actions workflow for automated deployment:
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm run deploy:aws
```

### Environment Variables
Set production environment variables in AWS console or `.env.production`

---

## 📊 Database Schema

### Core Tables
- **users** - Authentication and user accounts
- **user_profiles** - Extended profile information
- **universities** - University/institution data
- **credentials** - Academic credentials
- **messages** - Encrypted messages
- **conversations** - Message threads
- **alumni_connections** - Network relationships
- **exam_results** - Academic results
- **newsletters** - Generated newsletters

See database schema in `src/db/schema.ts`

---

## 🤝 Contributing

We welcome contributions from the KLH community!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow existing code style

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Documentation
- [Blockchain Integration](BLOCKCHAIN.md)
- [Security & E2EE](SECURITY.md)

### Contact
- Email: support@unilink-klh.edu
- Discord: [Join our community](https://discord.gg/unilink)
- Issues: [GitHub Issues](https://github.com/your-org/unilink/issues)

---

## 🎓 For KLH Community

UniLink is built **by KLH, for KLH**. This platform is completely free and designed to strengthen connections within our university community.

### Access Requirements
- Valid KLH email address (@klh.edu.in, @kletech.ac.in, @kle.edu.in)
- Current student or alumni status
- Agreement to community guidelines

### Mission
To create a secure, innovative platform that empowers KLH students and alumni to connect, collaborate, and grow together.

---

<div align="center">

**Made with ❤️ for the KLH Community**

[Homepage](https://unilink-klh.edu) • [Documentation](./docs) • [Report Bug](https://github.com/your-org/unilink/issues)

</div>