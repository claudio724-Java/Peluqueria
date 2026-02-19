import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a default salon
  const salon = await prisma.salon.upsert({
    where: { slug: "hairbook-demo" },
    update: {},
    create: {
      name: "HairBook Demo",
      slug: "hairbook-demo",
      phone: "+34 600 000 000",
      timezone: "Europe/Madrid",
    },
  });

  // Default owner user: admin@hairbook.local / admin1234
  const email = "admin@hairbook.local";
  const password = "admin1234";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { salonId: salon.id, passwordHash, isActive: true },
    create: {
      email,
      name: "Admin",
      role: "OWNER",
      salonId: salon.id,
      passwordHash,
    },
  });

  // Seed services
  const services = [
    { name: "Corte", durationMin: 30, priceCents: 1500, bufferMin: 0 },
    { name: "Barba", durationMin: 20, priceCents: 1000, bufferMin: 0 },
    { name: "Tinte", durationMin: 90, priceCents: 4500, bufferMin: 10 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { salonId_name: { salonId: salon.id, name: s.name } },
      update: { durationMin: s.durationMin, priceCents: s.priceCents, bufferMin: s.bufferMin, isActive: true },
      create: { salonId: salon.id, ...s },
    });
  }

  // Seed staff
  const staff = await prisma.staff.upsert({
    where: { salonId_name: { salonId: salon.id, name: "María" } },
    update: { isActive: true },
    create: {
      salonId: salon.id,
      name: "María",
      role: "Estilista",
      isActive: true,
    },
  });

  // Schedule Mon-Fri 09:00-14:00, 16:00-20:00
  const weekdays = [1, 2, 3, 4, 5];
  for (const dayOfWeek of weekdays) {
    await prisma.staffSchedule.upsert({
    where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek } },
    update: { startMin: 9 * 60, endMin: 20 * 60 },
    create: { staffId: staff.id, dayOfWeek, startMin: 9 * 60, endMin: 20 * 60 },
  });
  }

  console.log("Seed completed.");
  console.log("Login => email: admin@hairbook.local  password: admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
