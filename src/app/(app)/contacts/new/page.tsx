import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { createContact } from "../actions";
import { ContactForm } from "../contact-form";

export const dynamic = "force-dynamic";

export default function NewContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Add contact"
        description="Required: display name and category."
      />
      <SectionPanel title="Contact details">
        <ContactForm
          action={createContact}
          submitLabel="Create contact"
          cancelHref="/contacts"
        />
      </SectionPanel>
    </>
  );
}
