export interface PaymentGateway {
  charge(customerId: string, amountCents: number): Promise<{ chargeId: string }>
}
