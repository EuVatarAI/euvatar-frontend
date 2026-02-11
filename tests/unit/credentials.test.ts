import { describe, expect, it } from "vitest";
import { buildManageCredentialsPayload, isCredentialsConfigured } from "@/lib/credentials";

describe("credentials helpers", () => {
  it("isCredentialsConfigured returns false for empty keys", () => {
    expect(isCredentialsConfigured(undefined)).toBe(false);
    expect(isCredentialsConfigured({ heygen_api_key: null })).toBe(false);
    expect(isCredentialsConfigured({ heygen_api_key: "" })).toBe(false);
    expect(isCredentialsConfigured({ heygen_api_key: "   " })).toBe(false);
  });

  it("isCredentialsConfigured returns true for valid keys", () => {
    expect(isCredentialsConfigured({ heygen_api_key: "sk_test_123" })).toBe(true);
  });

  it("buildManageCredentialsPayload keeps explicit nulls", () => {
    const payload = buildManageCredentialsPayload({
      action: "fetch",
      avatarId: "avatar-1",
      clientId: null,
      userId: null,
    });

    expect(payload).toEqual({
      action: "fetch",
      avatarId: "avatar-1",
      clientId: null,
      userId: null,
    });
  });

  it("buildManageCredentialsPayload omits undefined optional fields", () => {
    const payload = buildManageCredentialsPayload({
      action: "fetch",
      avatarId: "avatar-1",
    });

    expect(payload).toEqual({
      action: "fetch",
      avatarId: "avatar-1",
    });
  });
});
