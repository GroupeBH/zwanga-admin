import mongoose, { Schema, model, models } from "mongoose";

const RecrutementAgentSchema = new Schema(
  {
    contact: {
      nomComplet: { type: String, required: true, trim: true },
      age: { type: Number, required: true, min: 16, max: 100 },
      telephone: { type: String, required: true, trim: true },
      sexe: { type: String, required: true, trim: true },
    },
    usage: {
      appareil: { type: String, required: true, trim: true },
      dejaTelecharge: { type: String, required: true, trim: true },
      profilUtilisateur: { type: String, required: true, trim: true },
    },
    retours: {
      problemesRencontres: { type: String, default: "", trim: true },
      comprehensionProjet: { type: String, required: true, trim: true },
      suggestionsAmelioration: { type: String, default: "", trim: true },
    },
    zonesDeploiement: [{ type: String, required: true }],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type RecrutementAgentDocument = mongoose.InferSchemaType<typeof RecrutementAgentSchema>;

if (process.env.NODE_ENV !== "production" && models.RecrutementAgent) {
  delete models.RecrutementAgent;
}

const RecrutementAgent = model("RecrutementAgent", RecrutementAgentSchema);

export default RecrutementAgent;
