# 📧 Nodemailer

[⬅ Back to main README](../../README.md)

## 🚀 Quick Navigation
- [1. What This Does](#-what-this-does)
- [2. When to Use Nodemailer (Use Cases)](#-when-to-use-nodemailer-use-cases)
- [3. Dependencies](#-dependencies)
- [4. .env Variables](#-env-variables)
  - [How to Get EMAIL_USER and EMAIL_PASS](#how-to-get-email_user-and-email_pass-gmail)
- [5. Connection Setup](#-connection-setup)
  - [What This Code Does](#what-this-code-does)
  - [Verifying the Connection](#verifying-the-connection-optional-but-useful)
- [6. Usage](#-usage)
  - [What This Code Does](#what-this-code-does-1)
  - [Basic Usage Example](#basic-usage-example)
- [7. HTML Templates for Different Sections](#-html-templates-for-different-sections)
- [8. Issues Faced & Fix](#-issues-faced--fix)
- [9. Extra Notes](#-extra-notes)
- [10. Summary](#-summary)

## 📁 Folder Structure
```
features/nodemailer/
  mailer.js
  templates/        (optional — HTML templates can live here)
  .env.example
  README.md
```

## 🔧 What This Does
Nodemailer is an npm package that lets a Node.js server send emails over SMTP. It's commonly used to automate emails such as:
- Welcome email after signup
- OTP verification (login / signup)
- Password reset link
- Order confirmations and notifications

## 🎯 When to Use Nodemailer (Use Cases)
Use this setup whenever the app needs to send an automated email, such as:
- **User signs up** → send a welcome email
- **User logs in / signs up with OTP flow** → send a one-time verification code
- **User requests "Forgot Password"** → send a reset link/token
- **An order/transaction is completed** → send a confirmation email
- **Any admin/system alert** → notify a user or admin by email

Don't use Nodemailer for real-time chat or bulk marketing campaigns (thousands of emails) — for large-scale sending, a dedicated service like SendGrid or Mailgun is better (Gmail has a daily limit, see Extra Notes).

## 📦 Dependencies
```bash
npm install nodemailer dotenv
```
- **nodemailer** — the core package, installed from the npm registry. This is the actual engine that connects to an email service and sends the mail.
- **dotenv** — loads sensitive values (like `EMAIL_USER`, `EMAIL_PASS`) from a `.env` file into `process.env`, so credentials never get hardcoded directly into the source code.

---

## 🔑 .env Variables

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_app_password
EMAIL_SERVICE=gmail
```

- **EMAIL_USER** — The Gmail address the emails will be sent from.
- **EMAIL_PASS** — This is NOT the normal Gmail password. Gmail blocks SMTP login with a regular password for security reasons, so a separate App Password is required.
- **EMAIL_SERVICE** — Tells Nodemailer which preset service to use (gmail, outlook, yahoo, etc.), so the SMTP host/port doesn't need to be set manually.

### How to Get EMAIL_USER and EMAIL_PASS (Gmail)
1. **EMAIL_USER** is simply the Gmail address that will send the emails (create a dedicated one for the project if needed).
2. Turn on **2-Step Verification** on that Gmail account → Google Account → Security → 2-Step Verification.
3. Once 2FA is on, an **"App Passwords"** option appears in the Security page (it's hidden until 2FA is enabled).
4. Enter any app name (e.g. "nodemailer-project") → click Generate.
5. Google generates a 16-character password — this goes into `EMAIL_PASS`.
6. This password is shown only once, so save it immediately somewhere safe.

⚠️ Never push this password to GitHub — make sure `.env` is added to `.gitignore`.

## ⚙️ Connection Setup

The first step in Nodemailer is creating a **transporter** — an object that connects to the email service and sends mail.

```js
// mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

module.exports = transporter;
```

### What This Code Does
- `require('dotenv').config()` — loads the `.env` file so variables like `process.env.EMAIL_USER` become available
- `nodemailer.createTransport()` — creates a transporter object that handles the actual SMTP connection
- `service: 'gmail'` — Nodemailer already has a preset SMTP config for Gmail, so host/port don't need to be written manually
- `auth` — login credentials that Gmail uses to confirm the request is genuine

### Verifying the Connection (optional but useful)
```js
transporter.verify((error, success) => {
  if (error) {
    console.log('Connection failed:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});
```
This checks whether the credentials are correct without actually sending an email — useful for testing the setup.

## 🚀 Usage

Once the transporter is ready, create a reusable `sendMail` function that can be called from anywhere.

```js
// mailer.js (add below the transporter)
const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email failed:', error);
    throw error;
  }
};

module.exports = { transporter, sendMail };
```

### What This Code Does
- `sendMail` is an async function that takes `to`, `subject`, `text`/`html` and sends the email
- `from` is always `EMAIL_USER` (the account logged in with)
- `text` is for plain text emails, `html` is for styled/formatted emails — use one or the other
- `try/catch` prevents the app from crashing if the email fails; it just logs/throws the error

### Basic Usage Example
```js
const { sendMail } = require('./mailer');

sendMail({
  to: "user@example.com",
  subject: "Welcome to the App!",
  text: "Thanks for signing up. We're glad to have you."
});
```

This can be imported and called in any controller/route — e.g. a welcome mail in the signup route, or a reset link in the forgot-password route.

## 🎨 HTML Templates for Different Sections

Instead of `text`, pass `html` for a styled email. Below are ready templates for the common use cases listed above.

**1. Welcome Email**
```js
sendMail({
  to: user.email,
  subject: "Welcome!",
  html: `
    <h2>Welcome, ${user.name}!</h2>
    <p>Thanks for signing up. We're glad to have you on board.</p>
  `
});
```

**2. OTP Verification**
```js
sendMail({
  to: user.email,
  subject: "Your OTP Code",
  html: `
    <h3>Your verification code is:</h3>
    <h1 style="letter-spacing: 4px;">${otp}</h1>
    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
  `
});
```

**3. Password Reset**
```js
sendMail({
  to: user.email,
  subject: "Reset Your Password",
  html: `
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
  `
});
```

**4. Order Confirmation**
```js
sendMail({
  to: user.email,
  subject: "Order Confirmed",
  html: `
    <h3>Your order #${orderId} is confirmed!</h3>
    <p>Total: ₹${amount}</p>
    <p>We'll notify you once it ships.</p>
  `
});
```

## ⚠️ Issues Faced & Fix

| Issue | Fix |
|---|---|
| `Invalid login` error | Was using the normal Gmail password — switched to an App Password to fix it |
| `self signed certificate` error | (if it occurs) add `tls: { rejectUnauthorized: false }` in the transporter (dev/testing only, avoid in production) |
| Email landing in spam folder | Used a proper name format in the `from` field: `"App Name" <email@gmail.com>` |

## 📝 Extra Notes
- Gmail's free account daily sending limit is ~500 emails/day — for larger scale, use a service like SendGrid or Mailgun
- App Password only appears once 2-Step Verification is turned on
- Never commit `.env` — it must already be in `.gitignore`

---

## ✅ Summary
Everything needed to add email-sending to any project is in this file: dependencies, env setup, transporter, reusable `sendMail` function, ready-to-use HTML templates, and known issues with fixes. No need to search or ask anywhere else — just follow this file top to bottom.