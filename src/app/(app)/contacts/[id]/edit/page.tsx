import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";
import { prisma } from "@/lib/prisma";
import { updateContact } from "../../actions";
import { ContactForm } from "../../contact-form";

export const dynamic = "force-dynamic";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) notFound();

  const update = updateContact.bind(null, id);

  return (
    <>
      <PageHeader
        eyebrow="Contacts"
        title="Edit contact"
        description={contact.displayName}
      />
      <SectionPanel title="Contact details">
        <ContactForm
          action={update}
          initial={contact}
          submitLabel="Save changes"
          cancelHref={`/contacts?id=${contact.id}`}
        />
      </SectionPanel>
    </>
  );
}
