import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // 1. Business Types
  const businessTypesData = [
    { name: "Salão de Beleza", slug: "salao-de-beleza", icon: "💇‍♀️" },
    { name: "Barbearia", slug: "barbearia", icon: "💈" },
    { name: "Clínica de Estética", slug: "clinica-de-estetica", icon: "✨" },
    { name: "Estúdio de Tatuagem", slug: "estudio-de-tatuagem", icon: "🎨" },
    { name: "Manicure e Pedicure", slug: "manicure-pedicure", icon: "💅" },
    { name: "Clínica de Massagem", slug: "clinica-de-massagem", icon: "💆" },
    { name: "Estúdio de Sobrancelhas", slug: "estudio-sobrancelhas", icon: "👁️" },
    { name: "Consultório", slug: "consultorio", icon: "🩺" },
    { name: "Outro", slug: "outro", icon: "🏪" },
  ];

  for (const bt of businessTypesData) {
    await db.execute(sql`
      INSERT INTO business_types (name, slug, icon, isActive, createdAt, updatedAt) 
      VALUES (${bt.name}, ${bt.slug}, ${bt.icon}, true, NOW(), NOW()) 
      ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon)
    `);
  }
  console.log(`  ✓ ${businessTypesData.length} business types seeded`);

  // 2. Subscription Plans
  const plansData = [
    {
      name: "Gratuito",
      slug: "gratuito",
      description: "Para começar a organizar sua agenda",
      priceMonthly: "0.00",
      maxProfessionals: 1,
      maxServices: 5,
      maxAppointmentsMonth: 50,
      displayOrder: 1,
    },
    {
      name: "Profissional",
      slug: "profissional",
      description: "Para negócios em crescimento",
      priceMonthly: "49.90",
      maxProfessionals: 5,
      maxServices: 20,
      maxAppointmentsMonth: 500,
      displayOrder: 2,
    },
    {
      name: "Premium",
      slug: "premium",
      description: "Para estabelecimentos consolidados",
      priceMonthly: "99.90",
      maxProfessionals: null,
      maxServices: null,
      maxAppointmentsMonth: null,
      displayOrder: 3,
    },
  ];

  for (const plan of plansData) {
    await db.execute(sql`
      INSERT INTO subscription_plans (name, slug, description, priceMonthly, maxProfessionals, maxServices, maxAppointmentsMonth, isActive, displayOrder, createdAt, updatedAt) 
      VALUES (${plan.name}, ${plan.slug}, ${plan.description}, ${plan.priceMonthly}, ${plan.maxProfessionals}, ${plan.maxServices}, ${plan.maxAppointmentsMonth}, true, ${plan.displayOrder}, NOW(), NOW()) 
      ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), priceMonthly = VALUES(priceMonthly)
    `);
  }
  console.log(`  ✓ ${plansData.length} subscription plans seeded`);

  console.log("\nSeed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
