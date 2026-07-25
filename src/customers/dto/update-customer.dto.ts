import { CreateCustomerDto } from './create-customer.dto';

// All CreateCustomerDto fields are already optional, so update reuses them as-is.
export class UpdateCustomerDto extends CreateCustomerDto {}
