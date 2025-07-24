// Package Types Interface
export interface PackageType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Updated Package interface to include package type information
export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number | null;
  session_count: number | null;
  package_type_id: string;
  features: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Combined Package with Type information (from the view)
export interface PackageWithType extends Package {
  package_type_name: string;
  package_type_description: string | null;
  package_type_color: string;
  package_type_icon: string | null;
}