# Free email for sign-up codes: Brevo

Supabase sends the 6-digit sign-up and password codes. Its built-in sender allows only 2 emails an hour, so we plug in **Brevo** (free plan, about 300 emails a day). Official guide: [Connect Brevo SMTP to Supabase](https://developers.brevo.com/docs/supabase-smtp-integration). Check Brevo's current free limits before relying on them.

## 1. Brevo
1. Create a free account at brevo.com and finish its account checks (Brevo may review a new account before it can send).
2. **Senders** (Senders, domains and dedicated IPs): add the email address the codes should come **from** and click the link Brevo emails you to verify it. This single-address verification needs no domain.
3. **SMTP and API → SMTP:** copy the **SMTP server** (`smtp-relay.brevo.com`), **port** (`587`) and your **SMTP login** (shown on that page; it is not always your normal login), and create an **SMTP key** (this is the password). Treat the key like a password: never paste it in chat, WhatsApp, GitHub or the app.

## 2. Supabase → Authentication → Emails → SMTP Settings
| Field | Value |
| --- | --- |
| Enable custom SMTP | on |
| Sender email | the address you verified in Brevo |
| Sender name | `Signals` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the SMTP login from Brevo |
| Password | the SMTP key |
| Minimum interval between emails to the same person | 60 seconds |
Then in **Rate Limits** raise "emails sent per hour" (it starts at about 30 with a custom sender). Put the code `{{ .Token }}` in the **Confirm signup** and **Reset password** templates (`AUTH_EMAIL_OTP.md`).

## 3. Test (do this today)
1. Sign up with a Gmail address, a college address and another provider if you can. Read the code in each inbox, **and check Spam**.
2. Try the wrong code, an old code, "send a new code", and "forgot password".
3. Look at Brevo → Statistics: delivered, bounced, blocked. Brevo shows today's count against the 300 a day.

## 4. The weak spot: a Gmail address as the sender
Without our own domain, the "from" address is probably a free address like Gmail. Big mailbox providers check that mail from a domain really comes from that domain; mail from a Gmail address sent through Brevo cannot pass that check, so it **may land in Spam or be rejected**, or Brevo may change the sender. **If your test codes land in Spam, the sender address is the cause.** The real fix is a sender on your own domain (needs a domain). Until then:
- Tell people to **check Spam** and put it on the sign-up screen ("Can't see it? Check Spam").
- Keep **Google sign-in** as the second button, since it sends no email.
- Spread sign-ups over the days before the fest, because the free limit is about 300 a day.
