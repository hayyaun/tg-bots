# Match Finding Bot - Complete Specification

## Requirements

- Add PostgreSQL to docker-compose
- Update inmankist bot to save user quiz results in PostgreSQL (a column for each quiz result)
- Create matchfound bot with profile management and matching features

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  telegram_id BIGINT PRIMARY KEY,          -- Telegram user ID as primary key
  username VARCHAR(255),                    -- Telegram username for connection
  display_name VARCHAR(100),               -- User's display name
  biography TEXT,                          -- Max 2000 chars
  birth_date DATE,                         -- To calculate age
  gender VARCHAR(20),                      -- male, female
  looking_for_gender VARCHAR(20),          -- male, female, both
  archetype_result VARCHAR(50),            -- Primary archetype result (e.g., "zeus", "hera")
  mbti_result VARCHAR(10),                 -- MBTI type (e.g., "ENFP", "INTJ")
  profile_images TEXT[],                    -- Array of image file IDs
  completion_score INTEGER DEFAULT 0,       -- Profile completion score (0-9)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Likes Table
```sql
CREATE TABLE likes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  liked_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, liked_user_id)
);
```

### Ignored Table
```sql
CREATE TABLE ignored (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  ignored_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, ignored_user_id)
);
```

### Reports Table
```sql
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  reported_user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** When a report is created, immediately call `notifyAdmin()` to send real-time notification to admin with reporter and reported user details.

## Bot Flow

### 1. User /start Command

When user sends `/start`, display welcome message:

```
به ربات دوستیابی خوش اومدی. چیزی که باید بدونی اینه که این ربات با رباتای دیگه فرق داره
اینجا دیگه خبری از آدمای عجیب غریب با اهداف مختلف نیست، فقط و فقط دوستیابی سالم، دقیقا همونی که تو دنبالشی
اینجا هیچ محدودیتی وجود نداره و میتونی به بهترین افراد مچ بشی
هدف اصلی این ربات پیدا کردن دوست یا پارتنر هست و هرچیزی غیر ازین دو مورد گزارش بشه بررسی میشه
برای اینکه بهترین افراد رو برای دوستی بهت پیشنهاد کنم حتما نیازه چند تا تست رو پاس کنی
```

Then show profile completion status and guide user to complete their profile.

### 2. Profile Setup & Completion System

Users need to complete their profile with the following fields (each worth +1 point, max 9 points):

- **Username** (required, +1): Telegram username for connection
- **Profile Images** (+1): At least one proper image (stored as Telegram file IDs)
- **Display Name** (+1): Max 100 characters
- **Biography** (+1): Max 2000 characters
- **Birth Date** (+1): To calculate and display age
- **Gender** (+1): male or female
- **Looking-for Gender** (+1): male, female, or both
- **Archetype Quiz** (+1): Complete archetype quiz in inmankist bot (saves to PostgreSQL)
- **MBTI Quiz** (+1): Complete MBTI quiz in inmankist bot (saves to PostgreSQL)

**Profile Completion Rules:**
- Show completion percentage in profile (e.g., "7/9 completed")
- Minimum completion threshold: 7/9 points required to use `/find` command
- Username is mandatory (cannot use `/find` without it)

**Integration with Inmankist Bot:**
- When user completes archetype or MBTI quiz in inmankist bot, results are saved to PostgreSQL `users` table
- Both bots share the same PostgreSQL database
- Inmankist bot updates `archetype_result` and `mbti_result` columns
- Matchfound bot reads these results for matching

### 3. User /find Command - Matching Algorithm

When user sends `/find`, show the best matches one by one.

**Match Display Format:**
- Profile picture(s)
- Display name
- Age (calculated from birth_date)
- Biography
- Quiz results (archetype + MBTI)
- Like/Dislike inline keyboard buttons

**Matching Criteria (all must be met):**

1. **Gender Filter:**
   - User's `looking_for_gender` must match target's `gender`
   - Or user's `looking_for_gender` is "both" and target's `gender` is valid

2. **Age Filter:**
   - Maximum 8 years age difference
   - Calculate: `ABS(user_age - target_age) <= 8`

3. **Archetype Matching:**
   - **For opposite-gender matching:**
     - Use archetype compatibility matrix based on recommended gods/goddesses (see `COMPLEMENTARY_MATRIX.md`)
     - Each goddess has a list of recommended gods (and vice versa)
     - Match users whose primary archetype is in the recommended list for the other user's archetype
     - Example: If user is Hera (goddess), match with recommended gods for Hera (Zeus, Apollo)
   - **For same-gender matching (female+female or male+male):**
     - Match users with the same primary archetype result
     - Example: Both users have "hera" as primary archetype

4. **MBTI Matching:**
   - Use MBTI compatibility matrix (see `COMPLEMENTARY_MATRIX.md`)
   - Each MBTI type has compatible types
   - Match users whose MBTI type is compatible with the user's MBTI type
   - Example: ENFP ↔ INTJ, INFJ ↔ ENTP, ISFJ ↔ ESFP, etc.

5. **Exclusion Filters:**
   - Exclude users already liked by current user
   - Exclude users who have ignored current user
   - Exclude users who have ignored current user (bidirectional)
   - Exclude current user themselves

**Matching Priority:**
1. Users with higher profile completion scores first
2. Users with matching archetype + MBTI (both criteria met)
3. Users with matching archetype only
4. Users with matching MBTI only

**Pagination (Tinder-style):**
- Show only 1 match per page
- User navigates through matches one by one using like/dislike buttons
- Each like/dislike action automatically shows the next match
- When no more matches available, show message: "You've seen all available matches. Try again later!"

**Rate Limiting:**
- Limit `/find` to once per hour per user (to prevent spam)

**Like Action:**
- When user clicks "Like":
  - Add entry to `likes` table: `(user_id, liked_user_id)` where both are telegram_id values
  - Check if mutual like exists (bidirectional check)
  - If mutual like: notify both users (optional feature)
  - Show next match

**Dislike Action:**
- When user clicks "Dislike":
  - Do nothing (just skip)
  - Show next match

### 4. User /liked Command - View Likes Received

When user sends `/liked`, show list of people who liked the user (and not already ignored).

**Display Format:**
- Show profiles one by one (same format as `/find`)
- Picture + name + age + biography + quiz results
- Show/Delete inline keyboard buttons

**Show Action:**
- When user clicks "Show":
  - Reveal the username of the person who liked them
  - Display: "Username: @username" (or "No username set" if not available)
  - Allow user to connect via Telegram

**Delete Action:**
- When user clicks "Delete":
  - Add entry to `ignored` table: `(user_id, ignored_user_id)` where both are telegram_id values
  - Remove from likes display (won't show again)
  - Show next person who liked them

## Matching Algorithm Details

See `COMPLEMENTARY_MATRIX.md` for the complete compatibility matrices and implementation details for both archetype and MBTI matching.

## Additional Features & Recommendations

### Profile Management Commands

- `/profile` - View and edit own profile
- `/completion` - Check profile completion status
- `/settings` - Update preferences

### Safety Features

- Report button on each profile:
  - Saves report to `reports` table in PostgreSQL
  - Immediately sends notification to admin via `notifyAdmin()` function
  - Notification includes: reporter info, reported user info, and reason (if provided)
- Admin receives real-time notifications for all reports
- Block feature (separate from ignore, prevents all interactions)

### Future Enhancements

- Mutual match notifications
- Match quality score (compatibility + completion)
- Filter by age range
- Filter by location (if added)
- Chat feature within bot (optional)
- Profile verification badges

## Technical Notes

### Database Connection
- Both inmankist and matchfound bots connect to same PostgreSQL database
- Use connection pooling for efficiency
- Handle connection errors gracefully

### Data Synchronization
- Inmankist bot writes quiz results to PostgreSQL immediately after quiz completion
- Matchfound bot reads from PostgreSQL for matching
- Consider caching frequently accessed data in Redis for performance

### Image Storage
- Store Telegram file IDs (not actual images)

### Error Handling
- Handle missing quiz results gracefully
- Show appropriate messages if user hasn't completed required quizzes
- Handle database connection failures

### Admin Notifications
- Use `notifyAdmin(message: string)` function to send notifications to admin
- Admin user ID stored in `ADMIN_USER_ID` environment variable
- Notifications sent for:
  - New user registrations (`/start` command)
  - User reports (immediately when report is submitted)
  - Critical errors and bot events
- Notification format: `🤖 MatchFound\n{message}` with HTML parse mode
- Handle notification failures gracefully (log error, don't crash bot)
