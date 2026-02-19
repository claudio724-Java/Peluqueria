import { z } from "zod";

export const AppointmentCreateSchema = z.object({
  salonId: z.string().min(1).optional(),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),
    consent: z.boolean().optional().default(true),
  }),
  startAt: z.string().datetime(),
  // optional: you can pass endAt; otherwise server computes by service duration+buffer
  endAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const AppointmentCancelSchema = z.object({
  reason: z.string().optional(),
});

export const AvailabilityQuerySchema = z.object({
  salonId: z.string().min(1).optional(),
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});
