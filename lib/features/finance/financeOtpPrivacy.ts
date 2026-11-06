/** Redux DevTools must not retain the OTP or a Request containing its body. */
export function redactFinanceAction<T>(action: T): T {
  if (!action || typeof action !== 'object') return action;
  const input = action as Record<string, any>;
  const meta = input.meta;
  if (!['createDirectPayout', 'retryPayout'].includes(meta?.arg?.endpointName)) return action;
  const args = meta.arg.originalArgs;
  const { baseQueryMeta: _transport, ...safeMeta } = meta;
  return { ...input, meta: { ...safeMeta, arg: { ...meta.arg, originalArgs: args && {
    ...args, ...(Object.hasOwn(args, 'otpCode') ? { otpCode: '[redacted]' } : {}),
    ...(args.body ? { body: { ...args.body, otpCode: '[redacted]' } } : {}),
  } } } } as T;
}
