import { z } from "zod";
import { normalizeOrgUnitName } from "@/lib/constants";

export const orgUnitNameSchema = z
  .string()
  .transform(normalizeOrgUnitName)
  .pipe(z.string().min(3).max(150));
