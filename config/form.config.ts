export const SERVICES = [
  { id: "permis", label: "Permis", prix: 50 },
  { id: "carte-grise", label: "Carte grise", prix: 75 },
  { id: "assurance", label: "Assurance", prix: 90 },
  { id: "controle-technique", label: "Controle technique", prix: 65 },
  { id: "certificat-cession", label: "Certificat de cession", prix: 40 },
] as const;

export const FORM_STEPS = [
  "Identite",
  "Contact",
  "Adresse",
  "Vehicule",
  "Services",
  "Revision",
] as const;

