import mongoose, { Schema, model, models } from "mongoose";

const DemandeSchema = new Schema(
  {
    identite: {
      nomComplet: { type: String, required: true, trim: true },
    },
    contact: {
      telephone: { type: String, required: true, trim: true },
    },
    vehicule: {
      marqueComplete: { type: String, required: true, trim: true },
      plaqueImmatriculation: { type: String, required: true, trim: true, uppercase: true },
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

