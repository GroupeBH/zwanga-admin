import mongoose, { Schema, model, models } from "mongoose";

const DemandeSchema = new Schema(
  {
    identite: {
      prenom: { type: String, required: true, trim: true },
      nom: { type: String, required: true, trim: true },
      dateNaissance: { type: String, required: true, trim: true },
    },
    contact: {
      email: { type: String, required: true, trim: true, lowercase: true },
      telephone: { type: String, required: true, trim: true },
    },
    adresse: {
      ligne1: { type: String, required: true, trim: true },
      ville: { type: String, required: true, trim: true },
      commune: { type: String, default: "", trim: true },
      codePostal: { type: String, default: "", trim: true },
    },
    vehicule: {
      marque: { type: String, required: true, trim: true },
      modele: { type: String, required: true, trim: true },
      immatriculation: { type: String, required: true, trim: true, uppercase: true },
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

const Demande = models.Demande || model("Demande", DemandeSchema);

export default Demande;

