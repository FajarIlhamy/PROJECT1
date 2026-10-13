import { describe, expect, it } from "bun:test";
import { app } from "../src";

describe("Root & Health Check API", () => {
  it("GET / should return 200 and 'Hello World'", async () => {
    const response = await app.handle(
      new Request("http://localhost/")
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Hello World");
  });

  it("GET /health should return 200 and { status: 'ok' }", async () => {
    const response = await app.handle(
      new Request("http://localhost/health")
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ status: "ok" });
  });
});
