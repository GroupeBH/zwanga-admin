import mongoose, { Schema, model, models } from "mongoose";

const DemandeSchema = new Schema(
  {
    identite: {
      nom: { type: String, required: true, trim: true },
      postnom: { type: String, required: true, trim: true },
      prenom: { type: String, required: true, trim: true },
    },
    contact: {
      telephone: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
    },
    localisation: {
      province: { type: String, required: true, trim: true },
      ville: { type: String, required: true, trim: true },
      commune: { type: String, required: true, trim: true },
      quartier: { type: String, required: true, trim: true },
      avenueNumero: { type: String, required: true, trim: true },
      codePostal: { type: String, default: "", trim: true },
    },
    vehicule: {
      genre: { type: String, required: true, trim: true },
      marque: { type: String, required: true, trim: true },
      modele: { type: String, required: true, trim: true },
      vin: { type: String, required: true, trim: true, uppercase: true },
      plaqueActuelle: { type: String, default: "", trim: true, uppercase: true },
      couleur: { type: String, required: true, trim: true },
      anneeFabrication: { type: Number, required: true, min: 1950 },
      anneeMiseEnCirculation: { type: Number, required: true, min: 1950 },
      carburant: { type: String, required: true, trim: true },
    },
    services: [{ type: String, required: true }],
    total: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type DemandeDocument = mongoose.InferSchemaType<typeof DemandeSchema>;

if (process.env.NODE_ENV !== "production" && models.Demande) {
  delete models.Demande;
}

const Demande = model("Demande", DemandeSchema);

export default Demande;
