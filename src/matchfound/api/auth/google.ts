import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../../../db";
import { generateToken } from "../middleware/auth";
import log from "../../../log";
import { calculateAge } from "../../../shared/utils";

const GOOGLE_CLIENT_ID = process.env.MATCHFOUND_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.MATCHFOUND_GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.MATCHFOUND_GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const displayName = profile.displayName || null;
        const photo = profile.photos?.[0]?.value || null;
        
        // Try to get birthdate from Google People API
        let birthDate: Date | null = null;
        if (accessToken) {
          try {
            // Fetch birthday from Google People API
            const peopleApiResponse = await fetch(
              "https://people.googleapis.com/v1/people/me?personFields=birthdays",
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            
            if (peopleApiResponse.ok) {
              const peopleData = await peopleApiResponse.json();
              const birthdays = peopleData?.birthdays;
              
              if (birthdays && birthdays.length > 0) {
                // Get the first birthday (most users have one)
                const birthday = birthdays[0];
                if (birthday.date) {
                  const date = birthday.date;
                  // Google provides: {year: 1990, month: 1, day: 15}
                  // Note: year might be missing for privacy, month/day are 1-indexed
                  if (date.year && date.month && date.day) {
                    birthDate = new Date(date.year, date.month - 1, date.day);
                  }
                }
              }
            }
          } catch (err) {
            // Silently fail - birthday might not be available or user hasn't granted permission
            log.debug("Could not fetch birthday from Google People API", { error: err });
          }
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { google_id: googleId },
        });

        if (!user) {
          // Check if user exists with this email (for linking accounts)
          if (email) {
            user = await prisma.user.findFirst({
              where: { email },
            });
          }

          if (user) {
            // Link Google account to existing user
            // Only update age if user doesn't have one (don't overwrite existing)
            const updateData: {
              google_id: string;
              email: string | null;
              display_name: string | null;
              profile_image: string | null;
              birth_date?: Date;
              age?: number;
            } = {
              google_id: googleId,
              email: email || user.email,
              display_name: user.display_name || displayName,
              profile_image: user.profile_image || photo,
            };
            
            if (birthDate && !user.birth_date) {
              updateData.birth_date = birthDate;
              const age = calculateAge(birthDate);
              if (age && !user.age) {
                updateData.age = age;
              }
            }
            
            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });
          } else {
            // Create new user
            const age = birthDate ? calculateAge(birthDate) : null;
            user = await prisma.user.create({
              data: {
                google_id: googleId,
                email,
                display_name: displayName,
                profile_image: photo,
                birth_date: birthDate,
                age: age,
              },
            });
          }
        } else {
          // Update existing user info
          // Only update age if user doesn't have one (don't overwrite existing)
          const updateData: {
            email: string | null;
            display_name: string | null;
            profile_image: string | null;
            birth_date?: Date;
            age?: number;
          } = {
            email: email || user.email,
            display_name: user.display_name || displayName,
            profile_image: user.profile_image || photo,
          };
          
          if (birthDate && !user.birth_date) {
            updateData.birth_date = birthDate;
            const age = calculateAge(birthDate);
            if (age && !user.age) {
              updateData.age = age;
            }
          }
          
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }

        return done(null, user);
      } catch (error) {
        log.error("Google OAuth error", error);
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

