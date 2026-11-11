import type { Customer } from './customer'

export interface CustomerRepository {
  save(customer: Customer): Promise<void>
  findById(customerId: string): Promise<Customer | undefined>
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>()

  async save(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer)
  }

  async findById(customerId: string): Promise<Customer | undefined> {
    return this.customers.get(customerId)
  }
}
