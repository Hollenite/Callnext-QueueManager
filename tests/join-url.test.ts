import { describe, expect, it } from "vitest";
import { joinPathFromQr } from "@/lib/join-url";

const origin = "https://queue.example";
const id = "01f5699a-c79d-40ed-8b2b-b833df0cc975";

describe("joinPathFromQr", () => {
  it("accepts a same-origin join URL", () => {
    expect(joinPathFromQr(`${origin}/q/${id}`, origin)).toBe(`/q/${id}`);
  });

  it("accepts a relative join path", () => {
    expect(joinPathFromQr(`/q/${id}`, origin)).toBe(`/q/${id}`);
  });

  it("rejects another origin", () => {
    expect(joinPathFromQr(`https://evil.example/q/${id}`, origin)).toBeNull();
  });

  it("rejects a non-join path", () => {
    expect(joinPathFromQr(`${origin}/dashboard/${id}`, origin)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(joinPathFromQr("not a url", origin)).toBeNull();
    expect(joinPathFromQr("", origin)).toBeNull();
  });
});
