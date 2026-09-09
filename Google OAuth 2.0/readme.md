# Google OAuth 2.0 — Login/Signup (MERN)

A reusable, step-by-step guide to add "Sign in with Google" to a MERN backend. Covers getting credentials from Google Cloud Console, and two implementation approaches — direct (`google-auth-library`) and `Passport.js` — both issuing your app's own JWT after Google verifies the user.

## Quick Links

- [Part 1: Google Cloud Console Credentials Setup](#part-1-google-oauth-20-credentials-setup)
- [Part 2: Approach A — Direct (google-auth-library)](#part-2-approach-a--direct-google-auth-library)
- [Part 3: Approach B — Passport.js](#part-3-approach-b--passportjs)
- [Part 4: Common Fields — User Model Changes](#part-4-common-fields--user-model-changes)
- [Part 5: .env Reference](#part-5-env-reference)

---

## Part 1: Google OAuth 2.0 Credentials Setup

### Prerequisites

Before starting, make sure you have:

- **Node.js** installed on your machine
- A **Google account** to create OAuth credentials
- Your existing backend (Express + JWT) already set up

### Step 1: Access Google Cloud Console

1. Open your browser and go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create a New Project

1. Click the project dropdown at the top of the page (it says "Select a project")
2. Click **"New Project"**
3. Give it a name (e.g. `my-fashion-app`, or whatever your project is called)
4. Click **"Create"** and wait a few seconds for it to finish

### Step 3: Set Up the OAuth Consent Screen

This is the screen users see when they click "Continue with Google" — it shows what your app wants access to.

1. In the left menu, go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** as the user type (since this isn't a Google Workspace org, this is the correct option for public users)
3. Click **"Create"**
4. Fill in the form:
   - **App name**: your app's name (shown to users)
   - **User support email**: select your email
   - **Developer contact information**: enter your email
5. Click **"Save and Continue"**
6. On the next screen (Scopes), click **"Add or Remove Scopes"** and select:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

   This tells Google you only need the user's email and basic profile info — nothing more.
7. Click **"Save and Continue"** through the remaining steps

### Step 4: Add Test Users

While the app is in "Testing" mode (not published/verified), only specific accounts can log in.

1. In the **"Test users"** section, add your own Google email (the one you'll test with)
2. Click **"Save and Continue"**

> **Note:** To let any Google user log in, you'd need to "Publish" the app, and if you're using sensitive scopes, Google verification is required too. You can skip this for now during development.

### Step 5: Create OAuth Client ID Credentials

Now generate the actual credentials (Client ID + Secret).

1. In the left menu, go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → select **"OAuth client ID"**
3. Choose **"Web application"** as the application type
4. Give it a name (e.g. `Backend Web Client`)
5. Under **"Authorized redirect URIs"**, click **"+ Add URI"** and add a URL matching your own backend's port and route path, for example: `http://localhost:5000/api/auth/google/callback`. This is not a fixed value — it must match whatever port and route path your actual Express backend uses.
6. Click **"Create"**

A popup will show your **Client ID** and **Client Secret** — copy both and save them somewhere safe (you can always come back and view them again in the Console).

### Step 6: Set Up `.env` in Your Project

In your backend project's root, add this to `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

**What each variable does:**

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Tells Google which app is making the request |
| `GOOGLE_CLIENT_SECRET` | Verifies your app's identity — never expose this on the frontend, never commit it to GitHub |
| `GOOGLE_REDIRECT_URI` | Google sends the user back here after login — must exactly match what you set in the Console |
| `CLIENT_URL` | Your frontend URL — the backend uses this for the final redirect once the token is ready |

### Step 7: Install Node.js Dependencies

Your backend project (Express + JWT) is already set up, so you just need to add the OAuth-related packages.

**For Approach A (direct — google-auth-library):**

```bash
npm install google-auth-library
```

**For Approach B (Passport.js):**

```bash
npm install passport passport-google-oauth20
```

> You don't need to install both right now — install whichever approach you decide to implement first.

**What each package does:**

| Package | Purpose |
|---|---|
| `google-auth-library` | Google's official Node.js library — handles generating the consent URL, exchanging the auth code for tokens, and verifying the `id_token` |
| `passport` | Core authentication middleware for Node.js — manages the overall auth flow via strategies |
| `passport-google-oauth20` | The Google-specific strategy plugin for Passport — wraps the same OAuth flow with less manual code |

---

## Part 2: Approach A — Direct (google-auth-library)

Uses Google's official package directly — no abstraction, every step is explicit in your own code. Best for actually understanding what OAuth is doing.

### Flow

```text
User clicks "Continue with Google"
   → GET /api/auth/google → backend redirects to Google's consent screen
   → user approves on Google's screen
   → Google redirects back → GET /api/auth/google/callback?code=XYZ
   → backend exchanges the code for tokens, extracts user info
   → backend finds or creates the user in the database
   → backend issues its own JWT
   → backend redirects to the frontend with the token
```

### `config/googleClient.js`

Sets up the Google OAuth2 client using your credentials from `.env`.

```js
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default googleClient;
```

### `controllers/googleAuth.controller.js`

Contains the two API functions — one to redirect the user to Google, one to handle Google's response.

```js
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
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};
```

### `routes/googleAuth.routes.js`

```js
import express from "express";
import { googleAuthRedirect, googleAuthCallback } from "../controllers/googleAuth.controller.js";

const router = express.Router();

router.get("/auth/google", googleAuthRedirect);
router.get("/auth/google/callback", googleAuthCallback);

export default router;
```

### Frontend (this is all you need)

```html
<a href="http://localhost:5000/api/auth/google">Continue with Google</a>
```

After the callback, the backend redirects to `/oauth-success?token=...`. On that route, save the token to localStorage/redux the same way you handle a normal login response.

### How This Works — Function by Function

- **`generateAuthUrl()`** — builds Google's consent-screen URL, with your scopes (email/profile) and client info encoded into it. This is the URL you redirect the user to.
- **`getToken(code)`** — exchanges the one-time `code` (that Google sent back) for actual tokens (`access_token`, `id_token`). This is a server-to-server call to Google's token endpoint.
- **`verifyIdToken()`** — the `id_token` is a JWT signed by Google. This function verifies its signature, audience (matches your `client_id`), and expiry — so there's no risk of fake or tampered data being accepted.
- **`ticket.getPayload()`** — pulls the actual user data (email, name, picture, Google's unique user id `sub`) out of the verified token.
- **`generateToken(user._id)`** — your project's existing JWT-signing function, the same one used for normal email/password login. Reusing it here means all your existing protected routes work for Google-login users too, with zero extra changes.
- **`authProvider` field** — tracks how the user signed up (`local` vs `google`) — useful when you need to conditionally show password-related UI (Google users don't have a password).
- **`googleId` field** — stores Google's unique user identifier (`sub`), used to match the same account on future logins.

---

## Part 3: Approach B — Passport.js

Same end result as Approach A, but using the `passport-google-oauth20` strategy — less manual code, a bit more abstraction (Passport handles the code-exchange and verification internally).

### Install

```bash
npm install passport passport-google-oauth20
```

### Steps

1. **Configure the strategy** — give `passport-google-oauth20` your Client ID/Secret/Callback URL, and write a "verify callback" that decides whether the user is found in the DB or needs to be created.
2. **Initialize in your app** — add the `passport.initialize()` middleware. No session needed, since this setup uses stateless JWT auth (not `passport.session()`).
3. **Create two routes** — one redirects to Google (`passport.authenticate('google', {...})`), the other is the callback route where Passport handles the code exchange + verification automatically, and your controller issues the JWT at the end.

### `config/passport.js`

```js
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
```

### `app.js` (or `server.js`)

```js
import passport from "./config/passport.js";

app.use(passport.initialize());
// passport.session() is not needed — we're using JWT, not server-side sessions
```

### `controllers/googleAuth.controller.js`

```js
import { generateToken } from "../utils/token.js";

// runs after the callback route — req.user was already set by Passport
export const googleAuthSuccess = (req, res) => {
  const token = generateToken(req.user._id);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
};
```

### `routes/googleAuth.routes.js`

```js
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
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  googleAuthSuccess // by the time we reach here, req.user is already set
);

export default router;
```

### How This Works — Function by Function

- **`GoogleStrategy(...)`** — tells Passport how to authenticate with Google — defines your client credentials and callback URL.
- **Verify callback** `(accessToken, refreshToken, profile, done)` — Passport handles the code-exchange and token-verification internally, and hands you the `profile` (user data) directly. Your only job here is the DB logic (find or create the user).
- **`done(null, user)`** — tells Passport "verification succeeded, here's the user" — this is what sets `req.user` in the next middleware/route handler.
- **`passport.authenticate('google', {...})`** — a middleware factory. On the redirect route, it sends the user to Google. On the callback route, it exchanges the code and triggers the verify callback automatically.
- **`session: false`** — tells Passport not to create a server-side session, since this setup uses stateless JWT auth instead.

---

## Part 4: Common Fields — User Model Changes

Both Approach A and Approach B rely on the same two extra fields in your `User` model:

```js
googleId: { type: String },
authProvider: { type: String, enum: ["local", "google"], default: "local" },
avatar: { type: String },
```

> **Note:** Your `password` field needs to become conditional (only `required: true` when `authProvider === "local"`), since a Google-signed-up user has no password.

**Why these fields exist:**

| Field | Purpose |
|---|---|
| `googleId` | Google's unique user identifier (`sub` in the token payload) — used to match the same account on future Google logins |
| `authProvider` | Tracks how the user signed up (`local` vs `google`) — useful for conditionally showing password-related UI |
| `avatar` | Profile picture pulled from Google, saved so you don't have to ask the user to upload one |

---

## Part 5: .env Reference

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

These four variables cover both Approach A and Approach B — no extra `.env` values needed for either one.