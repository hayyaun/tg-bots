Requirements:

- add postgres to docker-compose.
- update inmankist bot to save user results in postgres. (a column for each quiz result)

# Match Finding Bot

1. user /start -> say these:

   - به ربات دوستیابی خوش اومدی. چیزی که باید بدونی اینه که این ربات با رباتای دیگه فرق داره
   - اینجا دیگه خبری از آدمای عجیب غریب با اهداف مختلف نیست، فقط و فقط دوستیابی سالم، دقیقا همونی که تو دنبالشی
   - اینجا هیچ محدودیتی وجود نداره و میتونی به بهترین افراد مچ بشی
   - هدف اصلی این ربات پیدا کردن دوست یا پارتنر هست و هرچیزی غیر ازین دو مورد گزارش بشه بررسی میشه
   - برای اینکه بهترین افراد رو برای دوستی بهت پیشنهاد کنم حتما نیازه چند تا تست رو پاس کنی

2. user needs to update profile:

   - add username to connect (required! +1)
   - add proper images (+1)
   - add display name (max 100 chars) (+1)
   - add biography (max 2000 chars) (+1)
   - add birth date to display age (+1)
   - add gender (+1)
   - add looking-for gender (+1)
   - go to "inmankist bot" and answer "archetype, mbti" quizes. (it updates the postres which is share database) (each quiz +1)

3. user /find -> shows the best matches:

   - shows users profiles as messages (picture + name + age + biography + quiz results of that person + like/dislike keyboard buttons).
   - when like: in `postgres:user.liked` column, add id of the user who liked. then go next.
   - when dislike: do nothing, go next.
     How it should search:
   - there's a match for each archetype from other gender. (for female+female just match the similars)
   - for mbti there's a match for each type.
   - match to the people with 8 years of difference at most.
   - (we will add more in the future)

4. user /liked -> shows the list of people who liked the user (and not already ignored):
   - show profiles one by one (picture + name + age + biography + quiz results + show/delete keyboard buttons)
   - when show: reveals the username of the user to let them connect.
   - when delete: just add them to `postgres:user.ignored`.
