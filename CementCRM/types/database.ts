export type UserRole = 'rep' | 'manager';

export type AccountType = 'dealer' | 'contractor' | 'rmc_plant' | 'project_site';

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'dealer', label: 'Dealer' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'rmc_plant', label: 'RMC Plant' },
  { value: 'project_site', label: 'Project Site' },
];

export type LeadStage =
  | 'New Lead'
  | 'Site Visit'
  | 'Quotation Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

export const LEAD_STAGES: LeadStage[] = [
  'New Lead',
  'Site Visit',
  'Quotation Sent',
  'Negotiation',
  'Won',
  'Lost',
];

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
  assigned_rep: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  account_id: string;
  stage: LeadStage;
  product_id: string | null;
  // Postgres `numeric` comes back from Supabase as a string, not a JS number.
  quantity: number | string | null;
  unit_price: number | string | null;
  expected_order_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  image_path: string | null;
  price: number | string;
  created_at: string;
  updated_at: string;
}
