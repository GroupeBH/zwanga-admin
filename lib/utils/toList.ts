/** Extrait un tableau depuis une reponse RTK Query, sans inventer d'autres cles. */
export const unwrapList = <T>(payload: unknown, nestedKey: string): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const nested = (payload as Record<string, unknown>)[nestedKey];
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
};

export const listProvidesTags = <T extends { id: string }>(
  type:
    | "Subscriptions"
    | "KYC"
    | "Rides"
    | "TripRequests"
    | "Bookings"
    | "Users"
    | "Payments",
  items: T[] | undefined | null,
  listId = "LIST"
) => {
  const list = Array.isArray(items) ? items : [];
  return [
    ...list.map(({ id }) => ({ type, id })),
    { type, id: listId } as const,
  ];
};
