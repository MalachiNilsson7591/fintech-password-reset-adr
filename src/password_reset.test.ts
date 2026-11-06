import assert from "node:assert/strict";
import { decideReset } from "./password_reset.ts";

const input = { email: "owner@example.com", deviceFingerprint: "known-device" };

assert.equal(decideReset(input, 0), "send-link");
assert.equal(decideReset(input, 3), "hold-for-review");
console.log("password reset decision test passed");
