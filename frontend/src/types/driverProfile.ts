export interface DriverProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  license_number?: string | null;
  license_state?: string | null;
  status?: string | null;
  has_profile_photo?: boolean;
  assigned_truck_id?: string | null;
  truck_unit_number?: string | null;
  truck_license_plate?: string | null;
  truck_license_state?: string | null;
  truck_make?: string | null;
  truck_model?: string | null;
  truck_year?: number | null;
  truck_type?: string | null;
  truck_status?: string | null;
}
