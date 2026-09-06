import "server-only";
import { Resend } from "resend";

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY fehlt.");
  return new Resend(process.env.RESEND_API_KEY);
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
