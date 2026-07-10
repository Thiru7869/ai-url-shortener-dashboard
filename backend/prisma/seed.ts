import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const nanoid = customAlphabet("23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", 7);

const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge"];
const OS_LIST = ["Windows", "macOS", "Linux", "Android", "iOS"];
const DEVICES = ["Desktop", "Mobile", "Tablet"];
const COUNTRIES = ["US", "IN", "GB", "DE", "BR", "AU", "CA"];
const REFERRERS = ["https://twitter.com", "https://google.com", "https://linkedin.com", null, "https://facebook.com"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(past);
}

async function main() {
  console.log("Seeding database...");

  const seedLinks = [
    { title: "Summer Sale Campaign", originalUrl: "https://example.com/summer-sale-2026", customAlias: "summer26" },
    { title: "Product Launch — Nova", originalUrl: "https://example.com/products/nova", customAlias: "nova" },
    { title: "Company Blog", originalUrl: "https://example.com/blog", customAlias: null },
    { title: "Webinar Registration", originalUrl: "https://example.com/webinars/q3-growth", customAlias: null },
    {
      title: "Expired Promo (demo)",
      originalUrl: "https://example.com/promo/old",
      customAlias: null,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      title: "Disabled Link (demo)",
      originalUrl: "https://example.com/disabled-demo",
      customAlias: null,
      disabled: true,
    },
  ];

  for (const seed of seedLinks) {
    const link = await prisma.link.create({
      data: {
        title: seed.title,
        originalUrl: seed.originalUrl,
        shortCode: seed.customAlias ?? nanoid(),
        isCustomAlias: Boolean(seed.customAlias),
        expiresAt: "expiresAt" in seed ? seed.expiresAt : null,
        status: "disabled" in seed && seed.disabled ? "DISABLED" : "ACTIVE",
      },
    });

    const clickCount = Math.floor(Math.random() * 120) + 10;
    const clicksData = Array.from({ length: clickCount }).map(() => ({
      linkId: link.id,
      timestamp: randomDateWithinLastDays(30),
      browser: randomFrom(BROWSERS),
      os: randomFrom(OS_LIST),
      device: randomFrom(DEVICES),
      country: randomFrom(COUNTRIES),
      referrer: randomFrom(REFERRERS),
      ipHash: nanoid(),
    }));

    await prisma.click.createMany({ data: clicksData });
    await prisma.link.update({ where: { id: link.id }, data: { clickCount } });

    console.log(`Created link "${link.title}" (${link.shortCode}) with ${clickCount} clicks`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
