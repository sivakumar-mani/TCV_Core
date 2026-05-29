export interface SupplierInterface {
  supplier_id: number;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gst_no: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: number;
  created_at?: string;
  updated_at?: string;
}
