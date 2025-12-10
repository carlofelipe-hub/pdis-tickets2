# PDIS Tickets - Claude Context File

## Project Overview

**PDIS Tickets** = Project Duo Information System Ticketing Portal - A ticketing system for submitting bugs, feature requests, and support tickets to the development team.

## Shared Authentication with pdis-dev

This project shares its authentication system and database with **pdis-dev** (the main PDIS dashboard). Both applications connect to the same PostgreSQL database and share:

- `User` table - Employee records
- `Account` table - OAuth provider accounts
- `Session` table - User sessions

**Important:** Users managed in pdis-dev can automatically access pdis-tickets with the same credentials.

## Tech Stack

### Frontend
- **Next.js 16** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS 4**
- **shadcn/ui** components
- **React Hook Form + Zod** (form handling and validation)
- **Lucide React** (icons)

### Backend & Database
- **PostgreSQL** (shared with pdis-dev)
- **Prisma ORM** v6.x
- **NextAuth.js v4** (authentication - same providers as pdis-dev)
- **Cloudinary** (file uploads/attachments)

## Architecture

### Authentication Flow
1. User logs in via Google OAuth or email/password
2. NextAuth.js validates against shared User table
3. Session created in shared Session table
4. JWT token issued with user profile data

### User Roles & Permissions
- **Regular Users**: Can create and view their own tickets
- **Process Owners** (isDepartmentHead, isOfficeHead, isGroupDirector): Can approve/reject tickets
- **Assigned Staff**: Can view and update tickets assigned to them

### Ticket Workflow

```
┌─────────────────┐
│  FOR_PD_APPROVAL│ ← User submits ticket
└────────┬────────┘
         │
    ┌────▼────┐
    │ Approve │
    │  or     │
    │ Reject  │
    └────┬────┘
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
SUBMITTED   CANCELLED
   │
   ▼
DEV_IN_PROGRESS
   │
   ▼
QA_TESTING
   │
   ▼
PD_TESTING
   │
   ▼
FOR_DEPLOYMENT
   │
   ▼
DEPLOYED
```

## Database Schema

### Ticket Tables (pdis-tickets specific)

- `Ticket` - Main ticket record
- `TicketAttachment` - File attachments (stored in Cloudinary)
- `TicketComment` - Comments on tickets
- `TicketStatusHistory` - Audit trail of status changes

### Shared Tables (from pdis-dev)

- `User` - Employee records
- `Account` - OAuth accounts
- `Session` - Active sessions
- `VerificationToken` - Email verification tokens

## File Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages
│   │   └── login/           # Login page
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth routes
│   │   ├── dashboard/       # Dashboard data
│   │   ├── tickets/         # Ticket CRUD
│   │   └── approvals/       # Process owner approvals
│   ├── dashboard/           # Main dashboard
│   ├── tickets/             # Ticket pages
│   │   ├── new/             # Create ticket
│   │   └── [id]/            # Ticket detail
│   └── approvals/           # Approval interface
├── components/
│   ├── providers/           # Context providers
│   └── ui/                  # shadcn components
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # Prisma client
│   ├── cloudinary.ts        # Cloudinary config
│   └── utils.ts             # Utilities
└── types/
    └── next-auth.d.ts       # Type extensions
```

## Environment Variables

```bash
# Database (same as pdis-dev)
DATABASE_URL="postgresql://..."

# NextAuth.js
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret"

# Google OAuth (same as pdis-dev)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

## Development Commands

```bash
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # Run ESLint
npx prisma studio    # Database management
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
```

## Important Notes

### When Working on This Project

1. **Shared Database**: Remember this shares a database with pdis-dev. Schema changes affect both apps.
2. **User Management**: Users are managed in pdis-dev's User Creation module. Don't create users directly here.
3. **Process Owners**: Users with `isDepartmentHead`, `isOfficeHead`, or `isGroupDirector = true` can approve tickets.
4. **File Uploads**: All attachments go to Cloudinary under `pdis-tickets/` folder.
5. **Dark Mode**: The app uses a dark theme by default. All components should support this.

### Code Conventions

- Use TypeScript strict mode
- Follow existing patterns from pdis-dev where applicable
- Use shadcn/ui components for consistency
- Implement proper error handling with user-friendly messages
- Keep API responses typed with Zod schemas

### Ticket Categories

- `BUG` - Something isn't working
- `FEATURE_REQUEST` - Request new functionality
- `ENHANCEMENT` - Improve existing features
- `SUPPORT` - Get help with an issue
- `TASK` - General task
- `OTHER` - Miscellaneous

### Priority Levels

- `LOW` - Minor issue
- `MEDIUM` - Standard priority
- `HIGH` - Needs attention
- `URGENT` - Critical issue

---

**Last Updated:** December 10, 2025
**Schema Version:** 1.0

