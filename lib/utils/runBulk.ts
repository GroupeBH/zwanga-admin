/**
 * Applique une action unitaire a plusieurs elements, l'un apres l'autre, en
 * attendant un endpoint groupe cote serveur. Chaque echec est conserve: on ne
 * presente jamais un lot partiellement traite comme entierement reussi.
 */
export async function runBulk<T>(
  items: readonly T[],
  action: (item: T) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void
) {
  const failed: { item: T; error: unknown }[] = [];
  let done = 0;
  onProgress?.(0, items.length);
  for (const item of items) {
    try {
      await action(item);
    } catch (error) {
      failed.push({ item, error });
    }
    done += 1;
    onProgress?.(done, items.length);
  }
  return { succeeded: items.length - failed.length, failed };
}

export const bulkSummary = (succeeded: number, failed: number, noun: string) =>
  failed === 0
    ? `${succeeded} ${noun}${succeeded > 1 ? "s" : ""} mis à jour.`
    : `${succeeded} ${noun}${succeeded > 1 ? "s" : ""} mis à jour, ${failed} en échec : réessayez ces éléments.`;
