/** Bound browser waits too; a server timeout alone cannot handle a lost mobile link. */
export async function publicServiceRequest(signal: AbortSignal, options: RequestInit = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  try {
    const response = await fetch('/api/demandes', { ...options, signal: controller.signal });
    // Keep the timeout until the small JSON payload is fully downloaded, not just its headers.
    await response.clone().text();
    return response;
  } catch (error) {
    if (timedOut) throw new Error('Connexion trop lente. Réessayez avec les mêmes informations.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
