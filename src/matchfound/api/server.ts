import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import { configDotenv } from "dotenv";
import log from "../../log";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import matchesRoutes from "./routes/matches";
import likesRoutes from "./routes/likes";
import telegramRoutes from "./routes/telegram";

configDotenv();

const app = express();
const PORT = process.env.MATCHFOUND_API_PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.MATCHFOUND_API_CORS_ORIGIN || "*",
  credentials: true,
}));

// Session middleware (for OAuth)
app.use(
  session({
    secret: process.env.MATCHFOUND_SESSION_SECRET || "your-session-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/telegram", telegramRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error("API Error", { error: err, path: req.path, method: req.method });
  res.status(500).json({ error: "Internal server error" });
});

export async function startAPIServer(): Promise<void> {
  try {
    // DB is already connected in main index.ts, so we just start the server
    app.listen(PORT, () => {
      log.info(`MatchFound API > Server started on port ${PORT}`);
    });
  } catch (error) {
    log.error("MatchFound API > Failed to start server", error);
    throw error;
  }
}

export default app;

