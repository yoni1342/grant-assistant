import { z } from 'zod';

export const PriceSpecificationSchema = z.object({
  price: z.number(),
  currency: z.string(),
  priceValidUntil: z.date().optional(),
});