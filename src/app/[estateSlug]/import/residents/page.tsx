import { CsvImportWizard } from "@/components/shared/CsvImportWizard";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { RESIDENT_IMPORT_HEADERS, RESIDENT_IMPORT_TEMPLATE } from "@/server/modules/imports/templates";
import type { ResidentImportRow } from "@/server/modules/imports/schema";
import { confirmResidentImportAction, validateResidentImportAction } from "./actions";

const COLUMNS = RESIDENT_IMPORT_HEADERS.map((key) => ({ key: key as keyof ResidentImportRow, label: key }));

export default async function ImportResidentsPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "residents:*"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Import residents</h1>
      <CsvImportWizard<ResidentImportRow>
        estateSlug={estateSlug}
        entityLabel="residents"
        templateCsv={RESIDENT_IMPORT_TEMPLATE}
        templateFilename="estateos-residents-template.csv"
        columns={COLUMNS}
        validateAction={validateResidentImportAction}
        confirmAction={confirmResidentImportAction}
      />
    </div>
  );
}
