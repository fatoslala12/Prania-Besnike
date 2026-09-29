import { z } from "zod";

export const responseSchema = z.object({
  content: z.string().trim().min(10).max(20000),
  isFinal: z.boolean(),
});
