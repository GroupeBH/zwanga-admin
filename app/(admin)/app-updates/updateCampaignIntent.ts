const KEY = 'zwanga.admin.update-campaign-intent.v1';
type Intent = { key: string; id: string };

/** Save before HTTP so reloads after a lost response reuse the same server intent. */
export function updateCampaignIntent(key: string, storage: Pick<Storage, 'getItem' | 'setItem'>, uuid: () => string): string {
  const raw = storage.getItem(KEY);
  if (raw) {
    // A corrupt saved intent must not silently generate a second campaign.
    const previous = JSON.parse(raw) as Intent;
    if (!previous || typeof previous.key !== 'string' || typeof previous.id !== 'string') throw new Error('Envoi précédent illisible. Vérifiez l’historique avant de recommencer.');
    if (previous.key === key) return previous.id;
  }
  const id = uuid();
  storage.setItem(KEY, JSON.stringify({ key, id }));
  return id;
}
