# ⚠️ IMPORTANT: AI ASSISTANT CONTEXT

## 🚨 CRITICAL: DEVELOPMENT ENVIRONMENT - NO DATABASE ACCESS

**This repository is in dev mode with NO local database access.**

### Rules:
- ❌ **DO NOT** run database migrations locally (`prisma migrate dev`, etc.)
- ❌ **DO NOT** attempt database connections or queries
- ✅ **DO** update `prisma/schema.prisma` when making schema changes
- ✅ **DO** create migration files manually: `prisma/migrations/YYYYMMDDHHMMSS_description/migration.sql`
- ✅ **DO** follow existing migration patterns
- ✅ User handles all database operations on the production server

### When Making Schema Changes:
1. Update `prisma/schema.prisma`
2. Create migration file manually following existing patterns
3. User will apply migrations on the server

**READ THIS BEFORE MAKING ANY DATABASE-RELATED SUGGESTIONS!**
