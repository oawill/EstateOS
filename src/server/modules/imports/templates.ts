export const PROPERTY_IMPORT_HEADERS = [
  "addressLabel",
  "propertyType",
  "blockName",
  "streetName",
  "unitLabels",
] as const;

export const PROPERTY_IMPORT_TEMPLATE = [
  PROPERTY_IMPORT_HEADERS.join(","),
  '"Block A, House 12",DETACHED_HOUSE,Block A,,',
  "12 Admiralty Way,FLAT_BLOCK,,Admiralty Way,1A;1B;2A;2B",
].join("\n");

export const RESIDENT_IMPORT_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "propertyAddressLabel",
  "unitLabel",
  "occupancyRole",
  "moveInDate",
  "emergencyContactName",
  "emergencyContactPhone",
  "vehiclePlateNumber",
] as const;

export const RESIDENT_IMPORT_TEMPLATE = [
  RESIDENT_IMPORT_HEADERS.join(","),
  'Adebayo,Lawal,adebayo@example.com,08012345678,"Block A, House 12",,OWNER,2023-01-15,Funke Lawal,08023456789,LND-421-KJ',
  "Tunde,Adeyemi,,08034567890,12 Admiralty Way,1A,TENANT,2024-06-01,,,",
].join("\n");
