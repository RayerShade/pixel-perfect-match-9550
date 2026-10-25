import { hash } from "bcryptjs";
import { adminYeniSifreSemasi } from "./admin-sifre";

/** Call only AFTER validating the admin's role. Auth's hash-import API leaves global password policies unchanged. */
export async function adminYeniSifreHash(sifre: string) {
  return hash(adminYeniSifreSemasi.parse(sifre), 10);
}