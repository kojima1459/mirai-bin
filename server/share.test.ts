import { describe, expect, it, vi, beforeEach } from "vitest";

// Bot検出パターンのテスト
describe("Bot Detection", () => {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /slurp/i, /facebook/i, 
    /twitter/i, /linkedin/i, /pinterest/i, /telegram/i,
    /whatsapp/i, /discord/i, /slack/i, /preview/i,
    /googlebot/i, /bingbot/i, /yandex/i, /baidu/i,
    /duckduck/i, /sogou/i, /exabot/i, /facebot/i,
    /ia_archiver/i, /mj12bot/i, /semrush/i, /ahref/i,
    /curl/i, /wget/i, /python/i, /java/i, /php/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
  ];

  const isBot = (userAgent: string): boolean => {
    return botPatterns.some(pattern => pattern.test(userAgent));
  };

  it("detects Googlebot", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
  });

  it("detects Facebook crawler", () => {
    expect(isBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
  });

  it("detects Twitter bot", () => {
    expect(isBot("Twitterbot/1.0")).toBe(true);
  });

  it("detects curl", () => {
    expect(isBot("curl/7.68.0")).toBe(true);
  });

  it("detects Python requests", () => {
    expect(isBot("python-requests/2.25.1")).toBe(true);
  });

  it("detects Puppeteer/Headless Chrome", () => {
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/90.0.4430.212")).toBe(true);
  });

  it("allows normal Chrome browser", () => {
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")).toBe(false);
  });

  it("allows normal Safari browser", () => {
    expect(isBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15")).toBe(false);
  });

  it("allows normal Firefox browser", () => {
    expect(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0")).toBe(false);
  });

  it("allows mobile Safari", () => {
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});

// 開封日時ロジックのテスト
describe("Unlock Time Logic", () => {
  it("allows unlock when unlockAt is null", () => {
    const unlockAt = null;
    const now = new Date();
    const canUnlock = !unlockAt || now >= new Date(unlockAt);
    expect(canUnlock).toBe(true);
  });

  it("allows unlock when current time is after unlockAt", () => {
    const unlockAt = new Date("2020-01-01T00:00:00Z");
    const now = new Date("2025-01-01T00:00:00Z");
    const canUnlock = !unlockAt || now >= unlockAt;
    expect(canUnlock).toBe(true);
  });

  it("prevents unlock when current time is before unlockAt", () => {
    const unlockAt = new Date("2030-01-01T00:00:00Z");
    const now = new Date("2025-01-01T00:00:00Z");
    const canUnlock = !unlockAt || now >= unlockAt;
    expect(canUnlock).toBe(false);
  });

  it("allows unlock at exact unlockAt time", () => {
    const unlockAt = new Date("2025-01-01T00:00:00Z");
    const now = new Date("2025-01-01T00:00:00Z");
    const canUnlock = !unlockAt || now >= unlockAt;
    expect(canUnlock).toBe(true);
  });
});

// 共有トークン生成のテスト
describe("Share Token Generation", () => {
  it("generates unique tokens", () => {
    const { nanoid } = require("nanoid");
    const token1 = nanoid(21);
    const token2 = nanoid(21);
    expect(token1).not.toBe(token2);
  });

  it("generates tokens of correct length", () => {
    const { nanoid } = require("nanoid");
    const token = nanoid(21);
    expect(token.length).toBe(21);
  });

  it("generates URL-safe tokens", () => {
    const { nanoid } = require("nanoid");
    const token = nanoid(21);
    // nanoidはURL-safeな文字のみを使用
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });
});
