import { z } from "zod";

/** Only for new accounts created by an authorized admin; never use for signup or password changes. */
export const adminYeniSifreSemasi = z.string().min(1, "Şifre boş bırakılamaz.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Şifre en fazla 72 bayt olabilir.");