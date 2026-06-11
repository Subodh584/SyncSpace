import { ZodError } from "zod";
import { AuthError } from "@/lib/auth-helpers";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ZodError) {
    return { ok: false, error: err.errors[0]?.message ?? "Invalid input" };
  }
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: "Something went wrong" };
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
