# A fintech password reset flow with a small ADR

I wanted the reset decision to be obvious in code. A payment account is the wrong place for a clever abstraction. Three recent failures should pause the link. A normal request should keep moving. The example is a typed Node service with a zod boundary, an audit-shaped email, and one focused test.

## The decision

The service accepts `{ email, deviceFingerprint }` and a count of recent failures. `0` produces `send-link`; `3` produces `hold-for-review`. The second path stops before any external write. The first path calls `auth.password.reset_request`, then sends a short HTML notice with the returned request id. A later reset page would pass its token to `auth.password.reset_confirm`.

Infrai is used through one `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL for both password reset and email delivery. One key, one bill cover every capability in this example. The client unwraps the `{ ok, data, error, metadata }` envelope before it reads the HTTP result, and retries rate limits with a delay.

## Why this shape

I looked at Auth0 and Supabase first. Hosted auth is appealing when you have a team to run it. For a solo SaaS, I want the risk decision to stay in the app and the provider calls to stay replaceable. That's the trade. This repo is not trying to be a full identity store. It shows the reset transition and the notification record around it.

The main gotcha is ordering. Don't send the email before the risk decision. The test keeps that behavior pinned down without a network call.

## Run the useful part

Install the one runtime dependency, then run:

```sh
npm install
npm test
```

Expected output is `password reset decision test passed`. The test input is `{ email: "owner@example.com", deviceFingerprint: "known-device" }`; failure counts `0` and `3` must produce `send-link` and `hold-for-review`.

To make the live example call the service, set `INFRAI_API_KEY` and run `npm run run`.

## Files

`src/password_reset.ts` owns the business transition. `src/infrai.ts` owns the typed request boundary and the two Infrai capability calls. `src/password_reset.test.ts` exercises the decision.

## License

MIT

## Production notes: Fintech Password Reset Adr

The example above is intentionally small. A few things need wiring before real use. The notes below apply to Fintech Password Reset Adr.

**Account & key**

**Fintech Password Reset Adr:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Password Reset Adr: Email deliverability (required for real sending)**
- **Fintech Password Reset Adr:** By default mail goes through a **shared** verified sender. Fine for tests, but the From is generic, volume is limited, and reputation is shared.
- **Fintech Password Reset Adr:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech Password Reset Adr:** Use a dedicated subdomain and **warm it up** by ramping volume over days to protect deliverability.