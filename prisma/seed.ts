import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAccount({
  email,
  password,
  name,
  role,
  salonName,
  slug,
}: {
  email: string;
  password: string;
  name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  salonName: string;
  slug: string;
}) {
  const salon = await prisma.salon.upsert({
    where: { slug },
    update: {
      name: salonName,
      timezone: "Atlantic/Canary",
    },
    create: {
      name: salonName,
      slug,
      phone: "+34 600 000 000",
      timezone: "Atlantic/Canary",
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      salonId: salon.id,
      passwordHash,
      isActive: true,
      role,
      name,
    },
    create: {
      email,
      name,
      role,
      salonId: salon.id,
      passwordHash,
      isActive: true,
    },
  });

  return salon;
}

async function main() {
  const ownerSalon = await createAccount({
    email: "admin@hairbook.local",
    password: "admin1234",
    name: "Owner Demo",
    role: "OWNER",
    salonName: "HairBook Demo",
    slug: "hairbook-demo",
  });

  await createAccount({
    email: "manager@hairbook.local",
    password: "manager1234",
    name: "Manager Demo",
    role: "MANAGER",
    salonName: "HairBook Manager Demo",
    slug: "hairbook-manager-demo",
  });

  const services = [
    { name: "Corte", durationMin: 30, priceCents: 1500, bufferMin: 0 },
    { name: "Barba", durationMin: 20, priceCents: 1000, bufferMin: 0 },
    { name: "Tinte", durationMin: 90, priceCents: 4500, bufferMin: 10 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { salonId_name: { salonId: ownerSalon.id, name: s.name } },
      update: { durationMin: s.durationMin, priceCents: s.priceCents, bufferMin: s.bufferMin, isActive: true },
      create: { salonId: ownerSalon.id, ...s },
    });
  }

  const staff = await prisma.staff.upsert({
    where: { salonId_name: { salonId: ownerSalon.id, name: "María" } },
    update: { isActive: true },
    create: {
      salonId: ownerSalon.id,
      name: "María",
      role: "Estilista",
      isActive: true,
    },
  });

  const weekdays = [1, 2, 3, 4, 5];
  for (const dayOfWeek of weekdays) {
    await prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek } },
      update: { startMin: 9 * 60, endMin: 20 * 60 },
      create: { staffId: staff.id, dayOfWeek, startMin: 9 * 60, endMin: 20 * 60 },
    });
  }

  console.log("Seed completed.");
  console.log("Owner => admin@hairbook.local / admin1234");
  console.log("Manager => manager@hairbook.local / manager1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
