import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed contacts for the J.G. Walsh & Co. workspace.
 * Every entry here is OBVIOUSLY editable sample data — names, phones, and
 * emails are placeholders. Replace as real contacts are captured.
 */
const seedContacts = [
  {
    displayName: "Town Building Department (placeholder)",
    company: "Town of Colonie — Building Department",
    role: "Permitting & inspections",
    category: "MUNICIPAL" as const,
    phone: "(518) 555-0100",
    email: "permits@example-town.gov",
    website: "https://www.colonie.org/departments/building/",
    notes:
      "Placeholder municipal contact. Replace with the real permitting clerk and inspector once confirmed.",
    status: "ACTIVE" as const,
  },
  {
    displayName: "Real Estate Attorney (placeholder)",
    company: "Sample Law Group, PLLC",
    role: "Real estate / closings",
    category: "LEGAL" as const,
    phone: "(518) 555-0110",
    email: "attorney@example-law.com",
    notes:
      "Placeholder counsel. Confirm engagement and add COI / W-9 once retained.",
    status: "PROSPECT" as const,
    licenseStatus: "REQUESTED" as const,
  },
  {
    displayName: "Insurance Agent (placeholder)",
    company: "Sample Insurance Brokers",
    role: "Property & liability",
    category: "INSURANCE" as const,
    phone: "(518) 555-0120",
    email: "agent@example-insurance.com",
    notes:
      "Placeholder broker for property, GL, and umbrella coverage across the portfolio.",
    status: "ACTIVE" as const,
    insuranceStatus: "CURRENT" as const,
  },
  {
    displayName: "General Contractor (placeholder)",
    company: "Sample General Contracting LLC",
    role: "GC — full-scope renovation",
    category: "CONTRACTORS_TRADES" as const,
    phone: "(518) 555-0130",
    email: "gc@example-contractor.com",
    relatedProperty: "322 Osborne Rd",
    relatedProject: "322 Osborne Renovation",
    notes:
      "Placeholder GC for 322 Osborne. Verify license, COI, and W-9 before contracting.",
    status: "PREFERRED" as const,
    insuranceStatus: "REQUESTED" as const,
    licenseStatus: "REQUESTED" as const,
    w9Status: "REQUESTED" as const,
  },
  {
    displayName: "Mason (placeholder)",
    company: "Sample Masonry Co.",
    role: "Masonry / chimney / foundation",
    category: "CONTRACTORS_TRADES" as const,
    phone: "(518) 555-0140",
    email: "mason@example-masonry.com",
    relatedProperty: "322 Osborne Rd",
    notes:
      "Placeholder mason. For chimney repair and foundation pointing scope at 322 Osborne.",
    status: "PROSPECT" as const,
  },
  {
    displayName: "Electrician (placeholder)",
    company: "Sample Electrical LLC",
    role: "Licensed electrician",
    category: "CONTRACTORS_TRADES" as const,
    phone: "(518) 555-0150",
    email: "electric@example-electric.com",
    notes:
      "Placeholder electrician. Confirm NY licensing and bond status before scheduling.",
    status: "PROSPECT" as const,
    licenseStatus: "REQUESTED" as const,
  },
  {
    displayName: "Plumber (placeholder)",
    company: "Sample Plumbing & Heating",
    role: "Plumbing & water heaters",
    category: "CONTRACTORS_TRADES" as const,
    phone: "(518) 555-0160",
    email: "plumb@example-plumbing.com",
    notes: "Placeholder plumber for portfolio service work.",
    status: "PROSPECT" as const,
  },
  {
    displayName: "Painter (placeholder)",
    company: "Sample Painting Co.",
    role: "Interior & exterior painting",
    category: "CONTRACTORS_TRADES" as const,
    phone: "(518) 555-0170",
    email: "paint@example-painters.com",
    notes: "Placeholder painter for turnover and renovation work.",
    status: "BACKUP" as const,
  },
  {
    displayName: "Property Manager (placeholder)",
    company: "Sample Property Management",
    role: "PM — rentals oversight",
    category: "PROPERTY_MANAGEMENT" as const,
    phone: "(518) 555-0180",
    email: "pm@example-pm.com",
    notes:
      "Placeholder PM contact for the active rentals (51 Loudonwood E and 16 Momrow Ct). Confirm engagement.",
    status: "PROSPECT" as const,
  },
  {
    displayName: "Utility Contact (placeholder)",
    company: "National Grid (placeholder)",
    role: "Utility account / outages",
    category: "UTILITIES" as const,
    phone: "(800) 555-0190",
    email: "support@example-utility.com",
    notes:
      "Placeholder utility contact. Replace with real service representative once accounts are linked.",
    status: "ACTIVE" as const,
  },
];

async function main() {
  console.log("Seeding contacts…");
  for (const c of seedContacts) {
    const existing = await prisma.contact.findFirst({
      where: { displayName: c.displayName },
    });
    if (existing) {
      console.log(`  ↺  skip (exists): ${c.displayName}`);
      continue;
    }
    await prisma.contact.create({ data: c });
    console.log(`  +  created: ${c.displayName}`);
  }
  console.log(`Done. ${seedContacts.length} placeholder contact(s) processed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
