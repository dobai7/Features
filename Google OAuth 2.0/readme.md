# Google OAuth 2.0 — Login/Signup (MERN)

A reusable, step-by-step guide to add "Sign in with Google" to a MERN backend. Covers getting credentials from Google Cloud Console, and two implementation approaches — direct (`google-auth-library`) and `Passport.js` — both issuing your app's own JWT after Google verifies the user.

## Quick Links

- [Part 1: Google Cloud Console Credentials Setup](#part-1-google-oauth-20-credentials-setup)
- [Part 2: Approach A — Direct (google-auth-library)](#part-2-approach-a--direct-google-auth-library)
- [Part 3: Approach B — Passport.js](#part-3-approach-b--passportjs)
- [Part 4: Function-by-Function Explanation](#part-4-function-by-function-explanation)
- [Part 5: .env Reference](#part-5-env-reference)

---

## 🚀 Part 1 — Google Cloud Console Setup

Before writing a single line of code, you need to create OAuth credentials from **Google Cloud Console**. These credentials allow your backend to communicate securely with Google's OAuth servers.

---

### 📋 Prerequisites

Make sure you already have:

- Node.js installed.
- An Express backend project.
- JWT authentication already implemented.
- A Google account.

---

### Step 1 — Open Google Cloud Console

1. Visit **Google Cloud Console**.
2. Sign in with your Google account.
3. Select an existing project or create a new one.

> 💡 Every OAuth application belongs to a Google Cloud Project.

---

### Step 2 — Create a New Project

1. Click **Select Project** at the top.
2. Click **New Project**.
3. Enter a project name.

Example:

```text
snitch-backend
moodify-auth
mern-google-oauth
```

4. Click **Create**.
5. Wait until Google creates the project.

**Best Practice**

Use one Google Cloud project per application instead of sharing one project across multiple apps.

---

### Step 3 — Configure OAuth Consent Screen

The OAuth Consent Screen is the page users see before granting permission.

#### Choose User Type

Select:

- **External**

Use **External** when anyone with a Google account should be able to sign in.

Choose **Internal** only for Google Workspace organizations.

---

#### Fill Application Information

| Field | Value |
|-------|-------|
| App Name | Your application name |
| User Support Email | Your Gmail |
| Developer Contact Email | Your Gmail |

Example:

```text
App Name: Snitch
Support Email: example@gmail.com
Developer Email: example@gmail.com
```

Click **Save and Continue**.

---

### Step 4 — Add OAuth Scopes

Click **Add or Remove Scopes**.

Select only these scopes:

```text
userinfo.email
userinfo.profile
openid
```

#### Why these scopes?

| Scope | Purpose |
|--------|----------|
| `userinfo.email` | Read user's email address. |
| `userinfo.profile` | Read user's name and profile image. |
| `openid` | Required for OpenID Connect identity verification (`id_token`). |

> ✅ Request only the scopes you actually need.

Click **Save and Continue**.

---

### Step 5 — Add Test Users

Your application starts in **Testing Mode**.

Only emails added here can log in.

#### Add Test User

1. Open **Test Users**.
2. Click **Add Users**.
3. Enter your Gmail.
4. Save.

Example:

```text
yourname@gmail.com
```

#### Testing vs Production

| Testing | Production |
|----------|------------|
| Only added emails can login. | Any Google user can login. |
| No Google verification needed. | Publishing may require verification for sensitive scopes. |

For local development, **Testing Mode is enough**.

---

### Step 6 — Create OAuth Client ID

Now create credentials.

1. Open **APIs & Services → Credentials**.
2. Click **Create Credentials**.
3. Choose **OAuth Client ID**.
4. Select **Web Application**.

#### Give the Client a Name

Example:

```text
Snitch Backend Client
```

---

### Step 7 — Configure Authorized Redirect URI

This is one of the most important steps.

#### Local Development

Add your backend callback endpoint.

```text
http://localhost:5000/api/auth/google/callback
```

If your backend uses another port:

```text
http://localhost:8000/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

The URI must match your backend exactly.

#### What is Redirect URI?

After Google authenticates the user, it sends the authorization code back to this URL.

Example flow:

```text
Google Login
      │
      ▼
User approves access
      │
      ▼
GET /api/auth/google/callback?code=XYZ123
```

Your backend receives `code` from this endpoint.

> ⚠️ Even a missing slash or wrong port causes authentication failure.

---

### Step 8 — Copy Client ID & Client Secret

After clicking **Create**, Google shows:

```env
Client ID
Client Secret
```

Copy both values immediately.

Store them inside your backend `.env` file.

> 🚨 Never expose `GOOGLE_CLIENT_SECRET` in frontend code or GitHub.

---

## ✅ Google Cloud Setup Checklist

- [ ] Google Cloud Project created.
- [ ] OAuth Consent Screen configured.
- [ ] External user type selected.
- [ ] Email, Profile and OpenID scopes added.
- [ ] Test user added.
- [ ] OAuth Client ID created.
- [ ] Redirect URI added correctly.
- [ ] Client ID copied.
- [ ] Client Secret copied safely.

---

## Part 2: Approach A — Direct (google-auth-library)

Uses Google's official package directly — no abstraction, every step is explicit in your own code. Best for actually understanding what OAuth is doing.

### Flow

\`\`\`
User clicks "Continue with Google"
   → GET /api/auth/google → backend redirects to Google's consent screen
   → user approves on Google's screen
   → Google redirects back → GET /api/auth/google/callback?code=XYZ
   → backend exchanges the code for tokens, extracts user info
   → backend finds or creates the user in the database
   → backend issues its own JWT
   → backend redirects to the frontend with the token
\`\`\`

### `config/googleClient.js`

Sets up the Google OAuth2 client using your credentials from `.env`.

\`\`\`js
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default googleClient;
\`\`\`

### `controllers/googleAuth.controller.js`

Contains the two API functions — one to redirect the user to Google, one to handle Google's response.

\`\`\`js
import googleClient from "../config/googleClient.js";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";
// generateToken = your existing single-JWT function, used in normal login too

// API 1: send the user to Google's consent screen
export const googleAuthRedirect = (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "consent",
  });

  res.redirect(authUrl);
};

// API 2: handle Google's response after the user approves
export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    // 1. exchange the code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // 2. verify the id_token and extract user data
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // 3. check if the user already exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      // new user — no password, since they signed up via Google
      user = await User.create({
        name,
        email,
        avatar: picture,
        googleId,
        authProvider: "google",
        isVerified: true, // trust Google's verification
      });
    } else if (!user.googleId) {
      // existing email/password user is now logging in via Google too
      user.googleId = googleId;
      await user.save();
    }

    // 4. issue your own single JWT
    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // 5. redirect back to the frontend
    res.redirect(\`${process.env.CLIENT_URL}/oauth-success?token=${token}\`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.redirect(\`${process.env.CLIENT_URL}/login?error=oauth_failed\`);
  }
};
\`\`\`

### `routes/googleAuth.routes.js`

\`\`\`js
import express from "express";
import { googleAuthRedirect, googleAuthCallback } from "../controllers/googleAuth.controller.js";

const router = express.Router();

router.get("/auth/google", googleAuthRedirect);
router.get("/auth/google/callback", googleAuthCallback);

export default router;
\`\`\`

### Frontend (this is all you need)

\`\`\`html
<a href="http://localhost:5000/api/auth/google">Continue with Google</a>
\`\`\`

After the callback, the backend redirects to `/oauth-success?token=...`. On that route, save the token to localStorage/redux the same way you handle a normal login response.

### How This Works — Function by Function

- **`generateAuthUrl()`** — builds Google's consent-screen URL, with your scopes (email/profile) and client info encoded into it. This is the URL you redirect the user to.
- **`getToken(code)`** — exchanges the one-time `code` (that Google sent back) for actual tokens (`access_token`, `id_token`). This is a server-to-server call to Google's token endpoint.
- **`verifyIdToken()`** — the `id_token` is a JWT signed by Google. This function verifies its signature, audience (matches your `client_id`), and expiry — so there's no risk of fake or tampered data being accepted.
- **`ticket.getPayload()`** — pulls the actual user data (email, name, picture, Google's unique user id `sub`) out of the verified token.
- **`generateToken(user._id)`** — your project's existing JWT-signing function, the same one used for normal email/password login. Reusing it here means all your existing protected routes work for Google-login users too, with zero extra changes.
- **`authProvider` field** — tracks how the user signed up (`local` vs `google`) — useful when you need to conditionally show password-related UI (Google users don't have a password).
- **`googleId` field** — stores Google's unique user identifier (`sub`), used to match the same account on future logins.

## Part 3: Approach B — Passport.js

Same end result as Approach A, but using the `passport-google-oauth20` strategy — less manual code, a bit more abstraction (Passport handles the code-exchange and verification internally).

### Install

\`\`\`bash
npm install passport passport-google-oauth20
\`\`\`

### Steps

1. **Configure the strategy** — give `passport-google-oauth20` your Client ID/Secret/Callback URL, and write a "verify callback" that decides whether the user is found in the DB or needs to be created.
2. **Initialize in your app** — add the `passport.initialize()` middleware. No session needed, since this setup uses stateless JWT auth (not `passport.session()`).
3. **Create two routes** — one redirects to Google (`passport.authenticate('google', {...})`), the other is the callback route where Passport handles the code exchange + verification automatically, and your controller issues the JWT at the end.

### `config/passport.js`

\`\`\`js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    // this is the "verify callback" — Passport handles the code exchange
    // internally and hands you the profile data directly, you just write the DB logic
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            avatar: profile.photos[0]?.value,
            googleId: profile.id,
            authProvider: "google",
            isVerified: true,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }

        done(null, user); // this becomes req.user later
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
\`\`\`

### `app.js` (or `server.js`)

\`\`\`js
import passport from "./config/passport.js";

app.use(passport.initialize());
// passport.session() is not needed — we're using JWT, not server-side sessions
\`\`\`

### `controllers/googleAuth.controller.js`

\`\`\`js
import { generateToken } from "../utils/token.js";

// runs after the callback route — req.user was already set by Passport
export const googleAuthSuccess = (req, res) => {
  const token = generateToken(req.user._id);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.redirect(\`${process.env.CLIENT_URL}/oauth-success?token=${token}\`);
};
\`\`\`

### `routes/googleAuth.routes.js`

\`\`\`js
import express from "express";
import passport from "passport";
import { googleAuthSuccess } from "../controllers/googleAuth.controller.js";

const router = express.Router();

// API 1: send the user to Google's consent screen
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// API 2: Passport handles the code exchange + verification automatically
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: \`${process.env.CLIENT_URL}/login?error=oauth_failed\`,
  }),
  googleAuthSuccess // by the time we reach here, req.user is already set
);

export default router;
\`\`\`

### How This Works — Function by Function

- **`GoogleStrategy(...)`** — tells Passport how to authenticate with Google — defines your client credentials and callback URL.
- **Verify callback** `(accessToken, refreshToken, profile, done)` — Passport handles the code-exchange and token-verification internally, and hands you the `profile` (user data) directly. Your only job here is the DB logic (find or create the user).
- **`done(null, user)`** — tells Passport "verification succeeded, here's the user" — this is what sets `req.user` in the next middleware/route handler.
- **`passport.authenticate('google', {...})`** — a middleware factory. On the redirect route, it sends the user to Google. On the callback route, it exchanges the code and triggers the verify callback automatically.
- **`session: false`** — tells Passport not to create a server-side session, since this setup uses stateless JWT auth instead.

## Part 4: Common Fields — User Model Changes

Both Approach A and Approach B rely on the same two extra fields in your `User` model:

\`\`\`js
googleId: { type: String },
authProvider: { type: String, enum: ["local", "google"], default: "local" },
avatar: { type: String },
\`\`\`

> **Note:** Your `password` field needs to become conditional (only `required: true` when `authProvider === "local"`), since a Google-signed-up user has no password.

**Why these fields exist:**

| Field | Purpose |
|---|---|
| `googleId` | Google's unique user identifier (`sub` in the token payload) — used to match the same account on future Google logins |
| `authProvider` | Tracks how the user signed up (`local` vs `google`) — useful for conditionally showing password-related UI |
| `avatar` | Profile picture pulled from Google, saved so you don't have to ask the user to upload one |

## Part 5: .env Reference

\`\`\`env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
\`\`\`

These four variables cover both Approach A and Approach B — no extra `.env` values needed for either one.