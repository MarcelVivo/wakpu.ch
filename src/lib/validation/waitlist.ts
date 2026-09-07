import { z } from 'zod';
import { locales } from '@/i18n/locales';
export const waitlistSchema = z.object({ email: z.email().max(254), locale: z.enum(locales) }).strict();
