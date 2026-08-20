import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEmailConfigured, sendEmail } from "@/server/email/mailer";

describe("mailer", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("isEmailConfigured é false sem RESEND_API_KEY/EMAIL_FROM", () => {
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_API_KEY = "key";
    expect(isEmailConfigured()).toBe(false);
    process.env.EMAIL_FROM = "naoresponda@minhaparoquia.app";
    expect(isEmailConfigured()).toBe(true);
  });

  it("sem provedor configurado, só loga e não chama fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "fiel@example.com", subject: "Assunto", html: "<p>Oi</p>" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com provedor configurado, chama a API do Resend com os dados corretos", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "naoresponda@minhaparoquia.app";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "fiel@example.com", subject: "Assunto", html: "<p>Oi</p>" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toEqual({
      from: "naoresponda@minhaparoquia.app",
      to: "fiel@example.com",
      subject: "Assunto",
      html: "<p>Oi</p>",
    });
  });

  it("lança erro quando a API do Resend responde com falha", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "naoresponda@minhaparoquia.app";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(sendEmail({ to: "fiel@example.com", subject: "x", html: "x" })).rejects.toThrow();
  });
});
