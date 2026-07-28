# 📧 Nodemailer

> A practical guide to setting up and sending emails in Node.js using Nodemailer.

---

## 🚀 Quick Navigation

- [📁 Folder Structure](#-folder-structure)
- [1. What This Does](#1-what-this-does)
- [2. When to Use Nodemailer](#2-when-to-use-nodemailer)
- [3. Installation](#3-installation)
- [4. Environment Variables](#4-environment-variables)
  - [Gmail App Password Setup](#gmail-app-password-setup)
- [5. Connection Setup](#5-connection-setup)
  - [Create Transporter](#create-transporter)
  - [Verify Connection](#verify-connection)
- [6. Sending Emails](#6-sending-emails)
  - [Create sendMail Function](#create-sendmail-function)
  - [Basic Usage](#basic-usage)
- [7. HTML Email Templates](#7-html-email-templates)
  - [Welcome Email](#welcome-email)
  - [OTP Verification](#otp-verification)
  - [Email Verification](#email-verification)
  - [Forgot Password](#forgot-password)
  - [Password Reset](#password-reset)
  - [Order Confirmation](#order-confirmation)
  - [Order Shipped](#order-shipped)
  - [Contact Form Auto Reply](#contact-form-auto-reply)
  - [Newsletter](#newsletter)
- [8. Common Issues & Fixes](#8-common-issues--fixes)
- [9. Best Practices](#9-best-practices)
- [10. Summary](#10-summary)

---

## 📁 Folder Structure

Recommended structure for a reusable Nodemailer feature:

```text
features/
└── nodemailer/
    ├── transporter.js
    ├── sendMail.js
    ├── templates/
    │   ├── welcomeTemplate.js
    │   ├── otpTemplate.js
    │   ├── verificationTemplate.js
    │   ├── forgotPasswordTemplate.js
    │   ├── resetPasswordTemplate.js
    │   ├── orderConfirmationTemplate.js
    │   ├── orderShippedTemplate.js
    │   └── contactReplyTemplate.js
    ├── .env.example
    └── README.md
```

---

## 3. Installation

Install Nodemailer using npm:

```bash
npm install nodemailer
```

If your project uses environment variables, install `dotenv`:

```bash
npm install dotenv
```

### Dependencies

| Package | Purpose |
|----------|---------|
| `nodemailer` | Sends emails using SMTP or other supported transport methods. |
| `dotenv` | Loads environment variables from a `.env` file into `process.env`. |

---

## 4. Environment Variables

Store sensitive information like email credentials inside a `.env` file.

Never hardcode email credentials directly inside your application code.

```env
EMAIL_SERVICE=gmail

EMAIL_USER=your-email@gmail.com

EMAIL_PASS=your-16-character-app-password
```

### Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `EMAIL_SERVICE` | Email provider used for sending emails (Gmail, Outlook, Yahoo, etc.). |
| `EMAIL_USER` | Email account used to send emails. |
| `EMAIL_PASS` | App Password or SMTP password used for authentication. |

> **Note:** Never commit your `.env` file to GitHub. Add it to your `.gitignore` file.

---

### Gmail App Password Setup

Google does not allow applications to use your normal Gmail password for SMTP authentication.

Instead, create a **Gmail App Password** and use it as `EMAIL_PASS`.

#### Steps

1. Open your Google Account.
2. Go to **Security**.
3. Enable **2-Step Verification**.
4. Open **App Passwords**.
5. Create a new App Password.
6. Select:

```text
Mail
```

7. Select:

```text
Other (Custom Name)
```

8. Enter:

```text
Nodemailer
```

9. Copy the generated 16-character password.
10. Add it to your `.env` file.

Example:

```env
EMAIL_PASS=abcdefghijklmnop
```

---

#### Important

- Never use your Gmail account password.
- Never hardcode credentials.
- Never upload your `.env` file to GitHub.
- Use different email accounts for development and production.

---

## 5. Connection Setup

Before sending emails, Nodemailer needs a **Transporter**.

A transporter is responsible for connecting your application with an email service (SMTP server) and handling email delivery.

---

### Create Transporter

Create a file:

```text
features/
└── nodemailer/
    └── transporter.js
```

---

#### Method 1: Using Service

Beginner-friendly approach for providers like Gmail.

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
```

Nodemailer automatically configures SMTP settings based on the selected service.

---

#### Method 2: Using SMTP Host (Recommended)

This method provides more control over the email connection.

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",

  port: 587,

  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
```

##### SMTP Configuration

| Property | Description |
|----------|-------------|
| `host` | SMTP server address. Example: `smtp.gmail.com` |
| `port` | SMTP port. Usually `587` or `465` |
| `secure` | `true` for SSL (465), `false` for STARTTLS (587) |
| `auth.user` | Email address used for authentication |
| `auth.pass` | App Password or SMTP password |

---

##### Why Use SMTP Configuration?

Using `host`, `port`, and `secure` gives more control over the connection.

It also makes switching email providers easier.

Example:

```
Gmail → Brevo → Amazon SES
```

Only SMTP configuration needs to be changed.

---

### Verify Connection

Before sending emails, check whether the transporter can connect successfully.

```javascript
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Connection Failed");
    console.error(error);
  } else {
    console.log("SMTP Server is Ready");
  }
});
```

The `verify()` method only checks the SMTP connection.

It does **not** send any email.

---

## 6. Sending Emails

After creating the transporter, we can create a reusable function to send emails.

Instead of writing email logic everywhere, create a common `sendEmail()` function and use it throughout the application.

---

### Create sendMail Function

Create a file:

```text
features/
└── nodemailer/
    └── sendMail.js
```

```javascript
const transporter = require("./transporter");

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully:", info.messageId);

    return info;

  } catch (error) {
    console.error("Email sending failed:", error.message);

    throw error;
  }
};

module.exports = sendEmail;
```

---

#### Email Options Explained

| Property | Description |
|----------|-------------|
| `from` | Sender email address |
| `to` | Receiver email address |
| `subject` | Email subject |
| `text` | Plain text email content |
| `html` | HTML formatted email content |

---

### Basic Usage

Example:

```javascript
const sendEmail = require("./sendMail");

const sendWelcomeEmail = async () => {

  await sendEmail({
    to: "user@gmail.com",

    subject: "Welcome to Our Platform",

    text: "Thanks for joining us.",

    html: `
      <h1>Welcome User</h1>
      <p>Thanks for creating an account.</p>
    `,
  });

};

sendWelcomeEmail();
```

---

#### Sending Emails With Templates

For professional applications, keep email designs separate from email logic.

Example:

```text
features/
└── nodemailer/
    ├── sendMail.js
    └── templates/
        └── welcomeTemplate.js
```

Template file:

```javascript
const welcomeTemplate = (name) => {
  return `
    <h1>Welcome ${name}</h1>
    <p>Thanks for joining our platform.</p>
  `;
};

module.exports = welcomeTemplate;
```

Usage:

```javascript
const sendEmail = require("./sendMail");
const welcomeTemplate = require("./templates/welcomeTemplate");

await sendEmail({
  to: user.email,
  subject: "Welcome Email",
  html: welcomeTemplate(user.name),
});
```

---

#### Why Use a Separate sendEmail Function?

Benefits:

- Reusable across the application
- Keeps email logic in one place
- Easy to add templates
- Easy to change email providers
- Easier error handling

---

## 7. HTML Email Templates

HTML templates are used to create professional-looking emails.

Instead of writing HTML inside controllers, keep templates separate and reuse them whenever needed.

Recommended structure:

```text
features/
└── nodemailer/
    └── templates/
        ├── welcomeTemplate.js
        ├── otpTemplate.js
        ├── verificationTemplate.js
        └── forgotPasswordTemplate.js
```

---

### Welcome Email

File:

```text
templates/welcomeTemplate.js
```

```javascript
const welcomeTemplate = (name) => {
  return `
    <div>
      <h1>Welcome ${name} 🎉</h1>

      <p>
        Thanks for joining our platform.
        We are happy to have you with us.
      </p>

      <p>
        Start exploring our services today.
      </p>
    </div>
  `;
};

module.exports = welcomeTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Welcome to Our Platform",
  html: welcomeTemplate(user.name),
});
```

---

### OTP Verification

File:

```text
templates/otpTemplate.js
```

```javascript
const otpTemplate = (otp) => {
  return `
    <div>
      <h2>Your Verification OTP</h2>

      <h1>${otp}</h1>

      <p>
        This OTP is valid for a limited time.
      </p>

      <p>
        Do not share this OTP with anyone.
      </p>
    </div>
  `;
};

module.exports = otpTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "OTP Verification",
  html: otpTemplate(123456),
});
```

---

### Email Verification

File:

```text
templates/verificationTemplate.js
```

```javascript
const verificationTemplate = (verificationLink) => {
  return `
    <div>
      <h2>Verify Your Email</h2>

      <p>
        Click the button below to verify your email address.
      </p>

      <a href="${verificationLink}">
        Verify Email
      </a>
    </div>
  `;
};

module.exports = verificationTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Verify Your Email",
  html: verificationTemplate(link),
});
```

---

### Forgot Password

File:

```text
templates/forgotPasswordTemplate.js
```

```javascript
const forgotPasswordTemplate = (resetLink) => {
  return `
    <div>
      <h2>Password Reset Request</h2>

      <p>
        We received a request to reset your password.
      </p>

      <a href="${resetLink}">
        Reset Password
      </a>

      <p>
        If you did not request this, ignore this email.
      </p>
    </div>
  `;
};

module.exports = forgotPasswordTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Reset Your Password",
  html: forgotPasswordTemplate(resetLink),
});
```

---

### Password Reset

File:

```text
templates/resetPasswordTemplate.js
```

```javascript
const resetPasswordTemplate = (name) => {
  return `
    <div>
      <h2>Password Changed Successfully</h2>

      <p>
        Hello ${name},
      </p>

      <p>
        Your password has been updated successfully.
      </p>

      <p>
        If you did not make this change, contact support immediately.
      </p>
    </div>
  `;
};

module.exports = resetPasswordTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Password Updated Successfully",
  html: resetPasswordTemplate(user.name),
});
```

---

### Order Confirmation

File:

```text
templates/orderConfirmationTemplate.js
```

```javascript
const orderConfirmationTemplate = (orderId, amount) => {
  return `
    <div>
      <h2>Order Confirmed 🎉</h2>

      <p>
        Your order has been placed successfully.
      </p>

      <p>
        Order ID: ${orderId}
      </p>

      <p>
        Total Amount: $${amount}
      </p>

      <p>
        Thank you for shopping with us.
      </p>
    </div>
  `;
};

module.exports = orderConfirmationTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Order Confirmation",
  html: orderConfirmationTemplate(order.id, order.amount),
});
```

---

### Order Shipped

File:

```text
templates/orderShippedTemplate.js
```

```javascript
const orderShippedTemplate = (orderId, trackingId) => {
  return `
    <div>
      <h2>Your Order Has Been Shipped 🚚</h2>

      <p>
        Your order is on the way.
      </p>

      <p>
        Order ID: ${orderId}
      </p>

      <p>
        Tracking ID: ${trackingId}
      </p>

      <p>
        You can track your order using the tracking ID.
      </p>
    </div>
  `;
};

module.exports = orderShippedTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Order Shipped",
  html: orderShippedTemplate(order.id, trackingId),
});
```

---

### Contact Form Auto Reply

File:

```text
templates/contactReplyTemplate.js
```

```javascript
const contactReplyTemplate = (name) => {
  return `
    <div>
      <h2>Thanks for Contacting Us</h2>

      <p>
        Hello ${name},
      </p>

      <p>
        We have received your message.
        Our team will get back to you soon.
      </p>

      <p>
        Thank you.
      </p>
    </div>
  `;
};

module.exports = contactReplyTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "We Received Your Message",
  html: contactReplyTemplate(user.name),
});
```

---

### Newsletter

File:

```text
templates/newsletterTemplate.js
```

```javascript
const newsletterTemplate = (content) => {
  return `
    <div>
      <h2>Latest Updates</h2>

      <p>
        ${content}
      </p>

      <p>
        Thanks for staying connected.
      </p>
    </div>
  `;
};

module.exports = newsletterTemplate;
```

Usage:

```javascript
await sendEmail({
  to: user.email,
  subject: "Latest Updates",
  html: newsletterTemplate(message),
});
```

---

#### Custom Template Structure

For larger applications, keep every email template as a separate function.

Recommended structure:

```text
templates/
│
├── welcomeTemplate.js
├── otpTemplate.js
├── verificationTemplate.js
├── forgotPasswordTemplate.js
├── resetPasswordTemplate.js
├── orderConfirmationTemplate.js
├── orderShippedTemplate.js
├── contactReplyTemplate.js
└── newsletterTemplate.js
```

Template rules:

- Keep HTML separate from business logic.
- Use functions for dynamic data.
- Keep reusable components.
- Avoid writing HTML inside controllers.

---

## 8. Common Issues & Fixes

### Authentication Failed

#### Error:

```text
Invalid login: 535 Authentication failed
```

#### Fix:

- Check your email and password.
- Make sure you are using Gmail App Password.
- Do not use your normal Gmail password.
- Check `.env` values.

---

### Gmail Blocking Login

#### Problem:

Gmail blocks SMTP authentication.

#### Fix:

- Enable 2-Step Verification.
- Generate a new App Password.
- Update `EMAIL_PASS`.

---

### Emails Going to Spam

#### Possible reasons:

- Missing email formatting.
- Using free Gmail SMTP for production.
- No sender verification.

#### Fix:

- Use professional email services.
- Add proper HTML structure.
- Configure domain authentication (SPF, DKIM, DMARC).

---

### Environment Variables Not Loading

#### Problem:

`process.env.EMAIL_USER` returns undefined.

#### Fix:

Make sure dotenv is configured:

```javascript
require("dotenv").config();
```

Check:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password
```

Restart your server after changing `.env`.

---

### SMTP Connection Failed

#### Fix:

Check:

- SMTP host
- Port number
- Secure option
- Email credentials

Example:

```javascript
port: 587,
secure: false
```

---

## 9. Best Practices

### Keep Email Logic Separate

Avoid writing email code inside controllers.

Recommended:

```text
Controller
    |
    |
sendEmail()
    |
    |
Transporter
    |
    |
SMTP Server
```

---

### Use Templates

Do not write large HTML strings inside controllers.

Use separate template files:

```text
templates/
├── welcomeTemplate.js
├── otpTemplate.js
└── resetPasswordTemplate.js
```

---

### Store Credentials Securely

Always use environment variables.

Example:

```env
EMAIL_USER=
EMAIL_PASS=
```

Never:

```javascript
password: "mypassword123"
```

---

### Handle Errors Properly

Always use:

- `try/catch`
- proper error messages
- logging

---

### Use Email Services for Production

For real applications with high email volume, prefer:

- SendGrid
- Brevo
- Mailgun
- Amazon SES

instead of personal Gmail SMTP.

---

## 10. Summary

Nodemailer provides a simple way to send emails from Node.js applications.

With this setup you can implement:

- Welcome emails
- OTP verification
- Email verification
- Password reset
- Order updates
- Contact replies
- Notifications

Recommended flow:

```
.env
 |
 |
Transporter
 |
 |
sendEmail()
 |
 |
Email Template
 |
 |
User Inbox
```

Keep email configuration, sending logic, and templates separate to make your application clean and maintainable.