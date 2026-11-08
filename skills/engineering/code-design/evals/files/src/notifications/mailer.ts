export interface Mailer {
  sendReceipt(customerId: string, amountCents: number): Promise<void>
}
