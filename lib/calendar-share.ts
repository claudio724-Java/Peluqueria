import crypto from "crypto";

type BuildParams = {
  salonId: string;
  weekStart: string;
  staffId?: string;
  expiresAt: string;
};

function getSecret() {
  const secret = process.env.CALENDAR_IMAGE_SECRET || process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Falta CALENDAR_IMAGE_SECRET o WEBHOOK_SECRET");
  }
  return secret;
}

function getAppUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("Falta APP_URL");
  }
  return appUrl.replace(/\/$/, "");
}

function payloadString(params: BuildParams) {
  return [
    params.salonId,
    params.weekStart,
    params.staffId || "all",
    params.expiresAt,
  ].join("|");
}

export function signCalendarImage(params: BuildParams) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payloadString(params), "utf8")
    .digest("hex");
}

export function verifyCalendarImage(params: BuildParams & { signature?: string | null }) {
  if (!params.signature) return false;
  const expected = signCalendarImage(params);
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildCalendarImageUrl(params: {
  salonId: string;
  weekStart: string;
  staffId?: string;
  expiresInMinutes?: number;
}) {
  const expiresInMinutes = params.expiresInMinutes ?? 60;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  const signature = signCalendarImage({
    salonId: params.salonId,
    weekStart: params.weekStart,
    staffId: params.staffId,
    expiresAt,
  });

  const url = new URL("/api/calendar/weekly-image", getAppUrl());
  url.searchParams.set("salonId", params.salonId);
  url.searchParams.set("weekStart", params.weekStart);
  url.searchParams.set("expiresAt", expiresAt);
  url.searchParams.set("signature", signature);

  if (params.staffId) {
    url.searchParams.set("staffId", params.staffId);
  }

  return url.toString();
}