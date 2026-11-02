export type ProtocolSectionKey =
  | 'summary'
  | 'alerts'
  | 'initialAssessment'
  | 'diagnosticCriteria'
  | 'exams'
  | 'conduct'
  | 'treatment'
  | 'contraindications'
  | 'monitoring'
  | 'referral'
  | 'references'

export type Protocol = {
  id: string
  title: string
  category: string
  synonyms: string[]
  population: string
  context: string
  summary: string
  alerts: string[]
  initialAssessment: string[]
  diagnosticCriteria: string[]
  exams: string[]
  conduct: string[]
  treatment: string[]
  contraindications: string[]
  monitoring: string[]
  referral: string[]
  references: string[]
  sourceReferences: ProtocolSourceReference[]
  sourcePublishedAt: string | null
  sourceConsultedAt: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  source: string
  lastReviewed: string
  version: string
  approvalStatus: ProtocolApprovalStatus
  responsible: string
  statusNote: string
}

export type ClinicalReference = {
  id: string
  title: string
  organization: string
  url: string
  publishedAt: string | null
  accessedAt: string | null
}

export type ClinicalContentStatus =
  | 'cataloged'
  | 'source_verified'
  | 'clinically_reviewed'
  | 'withdrawn'

export type ClinicalTopic = {
  id: string
  name: string
  synonyms: string[]
  specialtyIds: string[]
  population: string | null
  referenceIds: string[]
  contentStatus: ClinicalContentStatus
  version: string
}

export type ClinicalPresentation = {
  id: string
  name: string
  group: string
  synonyms: string[]
  origin: 'user_provided_term'
  relatedTopicIds: string[]
  referenceIds: string[]
  contentStatus: ClinicalContentStatus
}

export type Medication = {
  id: string
  dcb: string | null
  activeIngredient: string
  pharmacologicalClass: string | null
  referenceIds: string[]
  anvisaStatus: 'not_verified' | 'registered' | 'not_registered'
  renameStatus: 'not_verified' | 'included' | 'not_included'
}

export type MedicationProduct = {
  id: string
  medicationId: string
  brandName: string | null
  pharmaceuticalForm: string | null
  strength: string | null
  routes: string[]
  anvisaRegistration: string | null
  professionalLeafletUrl: string | null
}

export type ProtocolApprovalStatus =
  | 'Rascunho'
  | 'Aguardando revisão'
  | 'Aprovado'
  | 'Desatualizado'
  | 'Retirado'

export type ProtocolSourceReference = {
  title: string
  organization: string
  url: string
  documentVersion: string | null
  publishedAt: string | null
  consultedAt: string
}

export type OfficialSourceRecord = {
  id: string
  title: string
  organization: string
  url: string
  checkedAt: string
  access: string
  reuse: string
}

export type OfficialDocumentRecord = {
  id: string
  title: string
  organization: string
  specialty: string
  specialtyClassification?: 'existing_catalog_mapping' | 'title_keyword_match' | 'unclassified'
  type: string
  publicationDate: string | null
  portariaDate?: string | null
  version: string | null
  updatedAt: string | null
  officialUrl: string
  sourceId: string
  catalogStatus: 'listed_in_official_catalog'
  validityStatus: 'not_individually_verified'
  reuseStatus: 'metadata_and_link_only'
  catalogedAt: string
}

export type Guideline = OfficialDocumentRecord

export type CatalogSearchEntry = {
  id: string
  title: string
  specialty: string
  type: string
  publicationYear: string | null
  organization: string
  version: string | null
  officialUrl: string
  pack: string
}

export type CatalogSpecialty = {
  id: string
  name: string
  documentCount: number
  subjectCount: number
  documentPack: string
  subjectPack: string
}

export type OfficialCatalogIndex = {
  schemaVersion: number
  catalogDate: string
  counts: {
    identifiedLegacySubjects: number
    subjectsWithOfficialDocuments: number
    legacySubjectsWithoutVerifiedDocumentLink: number
    documentsCataloged: number
    documentsWithTextReusePermission: number
    documentsWithIndividualCurrentValidityCheck: number
    completeClinicallyReviewedProtocols: number
    medicinesWithConfirmedAnvisaRegistration: number
    medicinesCataloged: number
    medicinesWithRegistrationNumber: number
    medicinesUniqueRegistrationNumbers: number
    recordsPendingVerification: number
  }
  specialties: CatalogSpecialty[]
  sourcesPath: string
  medicinesPath: string
  medicineSearchIndexPath: string
  searchEntries: CatalogSearchEntry[]
}

export type MedicineRecord = {
  id: string
  productName: string
  activeIngredient: string | null
  registrationNumber: string | null
  processNumber: string | null
  holder: string | null
  holderCnpj: string | null
  regulatoryCategory: string | null
  therapeuticClass: string | null
  registrationSituation: string | null
  processFinalizedAt: string | null
  registrationExpirationField: string | null
  productType: string
  sourceId: string
  pack: string
}

export type MedicineSearchRecord = Pick<
  MedicineRecord,
  | 'id'
  | 'productName'
  | 'activeIngredient'
  | 'registrationNumber'
  | 'holder'
  | 'regulatoryCategory'
  | 'therapeuticClass'
  | 'registrationSituation'
  | 'pack'
>

export type MedicineImportManifest = {
  schemaVersion: number
  sourceId: string
  sourceUrl: string
  dictionaryUrl: string
  retrievedAt: string
  recordsRead: number
  recordsImported: number
  duplicateRowsRemoved: number
  rejectedRows: number
  recordsWithRegistrationNumber: number
  uniqueRegistrationNumbers: number
  searchIndexPath: string
  shards: Array<{ id: string; path: string; recordCount: number }>
}

export type MedicineSearchIndex = {
  schemaVersion: number
  sourceId: string
  retrievedAt: string
  recordCount: number
  records: MedicineSearchRecord[]
}

export type MedicineRecordPack = {
  schemaVersion: number
  sourceId: string
  retrievedAt: string
  records: MedicineRecord[]
}

export type Category = {
  id: string
  name: string
  description: string
  icon: string
  protocols: string[]
}

export type Specialty = Category
