# ⚠️ IMPORTANT: AI ASSISTANT CONTEXT

## 🚨 CRITICAL: THIS IS A DEVELOPMENT ENVIRONMENT

**THIS REPOSITORY IS IN DEV MODE - NO DATABASE ACCESS AVAILABLE**

### Key Points:
- ❌ **DO NOT** attempt to run database migrations locally (`prisma migrate dev`, etc.)
- ❌ **DO NOT** try to connect to databases
- ❌ **DO NOT** assume a database is available
- ❌ **DO NOT** run any database-related commands
- ✅ **DO** create migration files manually when schema changes are made
- ✅ **DO** update code and schema files
- ✅ **DO** let the user handle database operations on the production server

### Development Environment:
- This is a **local development environment**
- **NO database is running locally**
- Production database is on a **remote server**
- Migrations should be created as **SQL files manually**
- Database operations happen **ONLY on the production server**

### When Making Schema Changes:
1. Update `prisma/schema.prisma`
2. Create migration file manually in `prisma/migrations/YYYYMMDDHHMMSS_description/migration.sql`
3. Follow the pattern of existing migrations
4. **DO NOT** run `prisma migrate dev` or similar commands
5. The user will apply migrations on the server

### Remember:
- Code changes: ✅ OK to make
- Schema changes: ✅ OK to make (update schema.prisma)
- Migration files: ✅ OK to create manually
- Running migrations: ❌ **NEVER** - user handles this on server
- Database queries/connections: ❌ **NEVER** - no DB available

**READ THIS BEFORE MAKING ANY DATABASE-RELATED SUGGESTIONS OR COMMANDS!**

