export const SERVICES = [
  { id: "nouveau-permis", label: "Nouveau Permis de conduire", prix: 50 },
  { id: "renouvellement-permis", label: "Renouvellement de Permis", prix: 45 },
  { id: "plaque-immatriculation", label: "Demande de Plaque d'immatriculation (Nouvelle serie)", prix: 95 },
  { id: "carte-rose", label: "Carte Rose (Volet Jaune)", prix: 80 },
  { id: "mutation", label: "Mutation (Changement de proprietaire)", prix: 110 },
  { id: "attestation-perte", label: "Attestation de Perte de documents", prix: 35 },
  { id: "vignette-annuelle", label: "Vignette annuelle", prix: 60 },
  { id: "controle-technique", label: "Certificat de Controle Technique", prix: 70 },
  { id: "autorisation-transport", label: "Autorisation de Transport (Personnes ou Biens)", prix: 120 },
  { id: "assurance-auto", label: "Assurance Automobile (SONAS ou Privee)", prix: 130 },
] as const;

export const FORM_STEPS = [
  "Identite",
  "Contact",
  "Localisation",
  "Vehicule",
  "Services",
] as const;
