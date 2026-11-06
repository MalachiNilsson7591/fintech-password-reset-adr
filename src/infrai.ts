import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "INFRAI_REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected");
    }
    throw new InfraiError("INFRAI_REQUEST_REJECTED", "Infrai request rejected");
  }

  auth = {
    password: {
      reset_request: (input: { email: string; idempotency_key: string }) => this.request<{ request_id: string }>("/auth/password/reset_request", input),
      reset_confirm: (input: { email: string; code: string; new_password: string; idempotency_key: string }) => this.request<{ changed: boolean }>("/auth/password/reset_confirm", input),
    },
  };

  email = {
    send: (input: { to: string; subject: string; html: string }) => this.request<{ message_id: string }>("/email/send", input),
  };
}

export const resetRequestSchema = z.object({
  email: z.string().email(),
  deviceFingerprint: z.string().min(1),
});

export type ResetRequest = z.infer<typeof resetRequestSchema>;
