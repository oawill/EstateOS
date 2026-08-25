import { CsvImportWizard } from "@/components/shared/CsvImportWizard";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { PROPERTY_IMPORT_HEADERS, PROPERTY_IMPORT_TEMPLATE } from "@/server/modules/imports/templates";
import type { PropertyImportRow } from "@/server/modules/imports/schema";
import { confirmPropertyImportAction, validatePropertyImportAction } from "./actions";

const COLUMNS = PROPERTY_IMPORT_HEADERS.map((key) => ({ key: key as keyof PropertyImportRow, label: key }));

export default async function ImportPropertiesPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  await guardPage(() => requireEstatePermission(estateSlug, "properties:*"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Import properties</h1>
      <CsvImportWizard<PropertyImportRow>
        estateSlug={estateSlug}
        entityLabel="properties"
        templateCsv={PROPERTY_IMPORT_TEMPLATE}
        templateFilename="estateos-properties-template.csv"
        columns={COLUMNS}
        validateAction={validatePropertyImportAction}
        confirmAction={confirmPropertyImportAction}
      />
    </div>
  );
}
