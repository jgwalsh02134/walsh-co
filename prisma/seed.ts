import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed contacts for the J.G. Walsh & Co. workspace.
 *
 * This seed is idempotent AND self-healing: if a previous seed left rows
 * named like "Electrician (placeholder)", they'll be located by their
 * `legacyDisplayName` value and updated in-place instead of being left
 * stale next to a freshly-created human-named contact.
 *
 * Lookup order per sample:
 *   1. By email (the most stable identifier across renames)
 *   2. By legacyDisplayName (e.g. "Electrician (placeholder)")
 *   3. Otherwise, create a new row.
 *
 * Sample human names paired with sample-only company names. Notes mark
 * each entry as editable sample data; no fake legal/town/insurance facts
 * are presented as verified.
 *
 * Phone numbers use the standard contact-manager display format the app
 * normalizes for tel: links: (xxx) xxx-xxxx.
 */

type SeedContact = {
  legacyDisplayName: string;
  data: {
    firstName: string;
    lastName: string;
    displayName: string;
    company: string;
    role: string;
    category:
      | "MUNICIPAL"
      | "LEGAL"
      | "INSURANCE"
      | "CONTRACTORS_TRADES"
      | "PROPERTY_MANAGEMENT"
      | "UTILITIES";
    phone: string;
    email: string;
    website?: string;
    notes: string;
    status?:
      | "ACTIVE"
      | "PROSPECT"
      | "PREFERRED"
      | "BACKUP"
      | "NEEDS_FOLLOWUP"
      | "INACTIVE"
      | "DO_NOT_USE";
    insuranceStatus?:
      | "UNKNOWN"
      | "MISSING"
      | "REQUESTED"
      | "CURRENT"
      | "EXPIRED"
      | "NOT_REQUIRED";
    licenseStatus?:
      | "UNKNOWN"
      | "MISSING"
      | "REQUESTED"
      | "CURRENT"
      | "EXPIRED"
      | "NOT_REQUIRED";
    w9Status?:
      | "UNKNOWN"
      | "MISSING"
      | "REQUESTED"
      | "CURRENT"
      | "EXPIRED"
      | "NOT_REQUIRED";
    relatedProperty?: string;
    relatedProject?: string;
    // Cross-module taxonomy (validated allowlists in
    // src/lib/contact-taxonomy.ts).
    entityType?: string;
    relationshipType?: string;
    functionalDomain?: string;
    specialty?: string;
    contextRole?: string;
  };
};

const seedContacts: SeedContact[] = [
  {
    legacyDisplayName: "Town Building Department (placeholder)",
    data: {
      firstName: "Morgan",
      lastName: "Hill",
      displayName: "Morgan Hill",
      company: "Town Building Department (sample)",
      role: "Permitting & inspections",
      category: "MUNICIPAL",
      phone: "(518) 555-0100",
      email: "morgan.hill@example-town.gov",
      website: "https://www.colonie.org/departments/building/",
      notes:
        "Sample municipal contact. Confirm the actual permitting clerk and inspector before treating any details here as verified town facts.",
      status: "ACTIVE",
      entityType: "PERSON",
      relationshipType: "GOVERNMENT_AHJ",
      functionalDomain: "PERMITTING_CODE",
      specialty: "Building department contact",
      contextRole: "Permit and inspection verification",
    },
  },
  {
    legacyDisplayName: "Real Estate Attorney (placeholder)",
    data: {
      firstName: "Rebecca",
      lastName: "Ellis",
      displayName: "Rebecca Ellis",
      company: "Sample Law Group, PLLC",
      role: "Real estate / closings",
      category: "LEGAL",
      phone: "(518) 555-0110",
      email: "rebecca.ellis@example-law.com",
      notes:
        "Sample counsel. Confirm engagement, license status, and W-9 once retained.",
      status: "PROSPECT",
      licenseStatus: "REQUESTED",
      entityType: "PERSON",
      relationshipType: "EXTERNAL_PROFESSIONAL",
      functionalDomain: "LEGAL",
      specialty: "Real estate attorney",
      contextRole: "Closing counsel",
    },
  },
  {
    legacyDisplayName: "Insurance Agent (placeholder)",
    data: {
      firstName: "Iris",
      lastName: "Allen",
      displayName: "Iris Allen",
      company: "Sample Insurance Brokers",
      role: "Property & liability",
      category: "INSURANCE",
      phone: "(518) 555-0120",
      email: "iris.allen@example-insurance.com",
      notes:
        "Sample broker for property, GL, and umbrella coverage across the portfolio.",
      status: "ACTIVE",
      insuranceStatus: "CURRENT",
      entityType: "PERSON",
      relationshipType: "INSURANCE_RISK",
      functionalDomain: "INSURANCE_RISK",
      specialty: "Insurance broker",
      contextRole: "Portfolio coverage",
    },
  },
  {
    legacyDisplayName: "General Contractor (placeholder)",
    data: {
      firstName: "Grace",
      lastName: "Carter",
      displayName: "Grace Carter",
      company: "Sample General Contracting LLC",
      role: "GC — full-scope renovation",
      category: "CONTRACTORS_TRADES",
      phone: "(518) 555-0130",
      email: "grace.carter@example-contractor.com",
      relatedProperty: "322 Osborne Rd",
      relatedProject: "322 Osborne Renovation",
      notes:
        "Sample GC for 322 Osborne. Verify license, COI, and W-9 before contracting.",
      status: "PREFERRED",
      insuranceStatus: "REQUESTED",
      licenseStatus: "REQUESTED",
      w9Status: "REQUESTED",
      entityType: "PERSON",
      relationshipType: "CONTRACTOR_SUBCONTRACTOR",
      functionalDomain: "CONSTRUCTION_MANAGEMENT",
      specialty: "General contractor",
      contextRole: "Awarded contractor — 322 Osborne",
    },
  },
  {
    legacyDisplayName: "Mason (placeholder)",
    data: {
      firstName: "Mason",
      lastName: "Reed",
      displayName: "Mason Reed",
      company: "Sample Masonry Co.",
      role: "Masonry / chimney / foundation",
      category: "CONTRACTORS_TRADES",
      phone: "(518) 555-0140",
      email: "mason.reed@example-masonry.com",
      relatedProperty: "322 Osborne Rd",
      notes:
        "Sample mason for chimney repair and foundation pointing scope at 322 Osborne.",
      status: "PROSPECT",
      entityType: "PERSON",
      relationshipType: "CONTRACTOR_SUBCONTRACTOR",
      functionalDomain: "CONSTRUCTION_MANAGEMENT",
      specialty: "Mason",
      contextRole: "Chimney + foundation bidder",
    },
  },
  {
    legacyDisplayName: "Electrician (placeholder)",
    data: {
      firstName: "Ethan",
      lastName: "Price",
      displayName: "Ethan Price",
      company: "Sample Electrical LLC",
      role: "Licensed electrician",
      category: "CONTRACTORS_TRADES",
      phone: "(518) 555-0150",
      email: "ethan.price@example-electric.com",
      notes:
        "Sample electrician. Confirm NY licensing and bond status before scheduling.",
      status: "PROSPECT",
      licenseStatus: "REQUESTED",
      entityType: "PERSON",
      relationshipType: "CONTRACTOR_SUBCONTRACTOR",
      functionalDomain: "CONSTRUCTION_MANAGEMENT",
      specialty: "Residential electrician",
      contextRole: "Electrical bidder for 322 Osborne",
    },
  },
  {
    legacyDisplayName: "Plumber (placeholder)",
    data: {
      firstName: "Peter",
      lastName: "Brooks",
      displayName: "Peter Brooks",
      company: "Sample Plumbing & Heating",
      role: "Plumbing / water heaters",
      category: "CONTRACTORS_TRADES",
      phone: "(518) 555-0160",
      email: "peter.brooks@example-plumbing.com",
      notes: "Sample plumber for portfolio service work.",
      status: "PROSPECT",
      entityType: "PERSON",
      relationshipType: "CONTRACTOR_SUBCONTRACTOR",
      functionalDomain: "CONSTRUCTION_MANAGEMENT",
      specialty: "Plumber",
      contextRole: "Service plumber",
    },
  },
  {
    legacyDisplayName: "Painter (placeholder)",
    data: {
      firstName: "Paige",
      lastName: "Turner",
      displayName: "Paige Turner",
      company: "Sample Painting Co.",
      role: "Interior & exterior painting",
      category: "CONTRACTORS_TRADES",
      phone: "(518) 555-0170",
      email: "paige.turner@example-painters.com",
      notes: "Sample painter for turnover and renovation work.",
      status: "BACKUP",
      entityType: "PERSON",
      relationshipType: "CONTRACTOR_SUBCONTRACTOR",
      functionalDomain: "CONSTRUCTION_MANAGEMENT",
      specialty: "Painter",
      contextRole: "Turnover painter",
    },
  },
  {
    legacyDisplayName: "Property Manager (placeholder)",
    data: {
      firstName: "Olivia",
      lastName: "Stone",
      displayName: "Olivia Stone",
      company: "Sample Property Management",
      role: "PM — rentals oversight",
      category: "PROPERTY_MANAGEMENT",
      phone: "(518) 555-0180",
      email: "olivia.stone@example-pm.com",
      notes:
        "Sample PM contact for the active rentals (51 Loudonwood E and 16 Momrow Ct). Confirm engagement.",
      status: "PROSPECT",
      entityType: "PERSON",
      relationshipType: "EXTERNAL_PROFESSIONAL",
      functionalDomain: "PROPERTY_MANAGEMENT",
      specialty: "Property manager",
      contextRole: "PM for active rentals",
    },
  },
  {
    legacyDisplayName: "Utility Contact (placeholder)",
    data: {
      firstName: "Victor",
      lastName: "Lane",
      displayName: "Victor Lane",
      company: "Sample Utility Account (placeholder)",
      role: "Utility account / outages — service coordination",
      category: "UTILITIES",
      phone: "(800) 555-0190",
      email: "victor.lane@example-utility.com",
      notes:
        "Sample utility contact. Replace with the real service representative once accounts are linked.",
      status: "ACTIVE",
      entityType: "PERSON",
      relationshipType: "UTILITY",
      functionalDomain: "UTILITIES_INFRASTRUCTURE",
      specialty: "Utility account contact",
      contextRole: "Electric/gas service coordination",
    },
  },
];

async function main() {
  console.log("Seeding contacts (idempotent + self-healing)…");
  for (const entry of seedContacts) {
    const { legacyDisplayName, data } = entry;

    // 1. Try to find by stable email.
    let existing = await prisma.contact.findFirst({
      where: { email: data.email },
    });

    // 2. Fall back to the legacy "(placeholder)" displayName.
    if (!existing) {
      existing = await prisma.contact.findFirst({
        where: { displayName: legacyDisplayName },
      });
    }

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data,
      });
      const renamed = existing.displayName !== data.displayName;
      console.log(
        `  ${renamed ? "↻ renamed" : "↺ updated"}: ${existing.displayName}${
          renamed ? ` → ${data.displayName}` : ""
        }`
      );
      continue;
    }

    await prisma.contact.create({ data });
    console.log(`  +  created: ${data.displayName}`);
  }
  console.log(`Done. ${seedContacts.length} sample contact(s) processed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
