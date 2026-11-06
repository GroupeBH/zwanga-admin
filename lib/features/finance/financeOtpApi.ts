import { baseApi } from '../api/baseApi';

export type FinanceOtpIntent = {
  action: 'direct_payout' | 'driver_payout_retry' | 'referral_withdrawal_retry';
  targetId?: string;
  payload: Record<string, unknown>;
};
export const financeOtpApi = baseApi.injectEndpoints({ endpoints: builder => ({
  sendFinanceOtp: builder.mutation<{ maskedPhone: string; expiresInSeconds?: number }, FinanceOtpIntent>({
    query: body => ({ url: '/admin/finance/otp', method: 'POST', body }),
  }),
}) });
export const { useSendFinanceOtpMutation } = financeOtpApi;
