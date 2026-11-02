import { baseApi } from '../api/baseApi';
import type { PaymentStatus } from '../admin/types';

export interface DirectPayoutInput {
  idempotencyKey: string;
  phone: string;
  amount: number;
  currency: 'CDF';
  reason: string;
  confirmed: true;
}
export interface DirectPayoutResult {
  id: string;
  idempotencyKey: string;
  actorId: string;
  amount: number;
  currency: string;
  phone: string;
  reason: string;
  status: PaymentStatus;
  reference: string;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
}
export const directPayoutApi = baseApi.injectEndpoints({ endpoints: builder => ({
  createDirectPayout: builder.mutation<DirectPayoutResult, DirectPayoutInput>({
    query: body => ({ url: '/admin/payments/direct-payouts', method: 'POST', body }),
    invalidatesTags: ['Payments', 'Dashboard'],
  }),
  getDirectPayout: builder.query<DirectPayoutResult, string>({
    query: key => `/admin/payments/direct-payouts/${encodeURIComponent(key)}`,
    keepUnusedDataFor: 0,
    providesTags: ['Payments'],
  }),
}) });
export const { useCreateDirectPayoutMutation, useLazyGetDirectPayoutQuery } = directPayoutApi;
