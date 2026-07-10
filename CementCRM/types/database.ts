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

export type AccountStatus = 'prospect' | 'active';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
  assigned_rep: string;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  account_id: string;
  stage: LeadStage;
  expected_order_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadItem {
  id: string;
  lead_id: string;
  product_id: string | null;
  // Postgres `numeric` comes back from Supabase as a string, not a JS number.
  quantity: number | string;
  unit_price: number | string;
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

export type QuotationStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent';

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  sent: 'Sent',
};

export interface Quotation {
  id: string;
  lead_id: string;
  status: QuotationStatus;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  quantity: number | string;
  unit_price: number | string;
  created_at: string;
}

export type SalesOrderStatus = 'confirmed' | 'delivery_planned' | 'dispatched' | 'delivered';

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  confirmed: 'Confirmed',
  delivery_planned: 'Delivery planned',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
};

export interface SalesOrder {
  id: string;
  lead_id: string;
  quotation_id: string;
  account_id: string;
  status: SalesOrderStatus;
  delivery_date: string | null;
  delivery_address: string | null;
  vehicle_info: string | null;
  driver_info: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  quantity: number | string;
  unit_price: number | string;
}
