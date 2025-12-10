import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../../../db";
import { generateToken } from "../middleware/auth";
import log from "../../../log";

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
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                google_id: googleId,
                email: email || user.email,
                display_name: user.display_name || displayName,
                profile_image: user.profile_image || photo,
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                google_id: googleId,
                email,
                display_name: displayName,
                profile_image: photo,
              },
            });
          }
        } else {
          // Update existing user info
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              email: email || user.email,
              display_name: user.display_name || displayName,
              profile_image: user.profile_image || photo,
            },
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

