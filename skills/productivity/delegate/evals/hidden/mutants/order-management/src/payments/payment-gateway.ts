export interface PaymentGateway {
  charge(customerId: string, amountCents: number): Promise<{ chargeId: string }>
  refund(chargeId: string, amountCents: number): Promise<void>
}
