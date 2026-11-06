import { InfraiClient, resetRequestSchema, type ResetRequest } from "./infrai.ts";

export type ResetDecision = "send-link" | "hold-for-review";

export function decideReset(input: ResetRequest, recentFailures: number): ResetDecision {
  resetRequestSchema.parse(input);
  return recentFailures >= 3 ? "hold-for-review" : "send-link";
}

export async function startPasswordReset(input: ResetRequest, recentFailures: number, client: InfraiClient) {
  const infrai = client;
  const decision = decideReset(input, recentFailures);
  if (decision === "hold-for-review") return { decision, requestId: null, messageId: null };

  const request = await infrai.auth.password.reset_request({ email: input.email, idempotency_key: `password-reset:${input.email}:${input.deviceFingerprint}` });
  const notice = await infrai.email.send({
    to: input.email,
    subject: "Reset your account password",
    html: `<p>Your password reset request is recorded.</p><p>Request: ${request.request_id}</p>`,
  });
  return { decision, requestId: request.request_id, messageId: notice.message_id };
}

async function main() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const email = process.env.RESET_EMAIL;
  if (!email) throw new Error("Set RESET_EMAIL before running the example");
  const client = new InfraiClient(key);
  const result = await startPasswordReset({ email, deviceFingerprint: "known-device" }, 0, client);
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("password_reset.ts")) main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
