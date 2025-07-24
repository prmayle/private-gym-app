import { createClient } from '@/utils/supabase/client';
import type { PackageType, PackageWithType } from '@/types/package-types';

// Get all active package types
export async function getPackageTypes(): Promise<PackageType[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('package_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching package types:', error);
    throw error;
  }

  return data || [];
}

// Get all packages with their type information
export async function getPackagesWithTypes(): Promise<PackageWithType[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('packages_with_types')
    .select('*')
    .eq('is_active', true)
    .order('package_type_name', { ascending: true });

  if (error) {
    console.error('Error fetching packages with types:', error);
    throw error;
  }

  return data || [];
}

// Get packages by type
export async function getPackagesByType(packageTypeId: string): Promise<PackageWithType[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('packages_with_types')
    .select('*')
    .eq('package_type_id', packageTypeId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching packages by type:', error);
    throw error;
  }

  return data || [];
}

// Create a new package type (admin only)
export async function createPackageType(packageType: Omit<PackageType, 'id' | 'created_at' | 'updated_at'>): Promise<PackageType> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('package_types')
    .insert([packageType])
    .select()
    .single();

  if (error) {
    console.error('Error creating package type:', error);
    throw error;
  }

  return data;
}

// Update a package type (admin only)
export async function updatePackageType(id: string, updates: Partial<PackageType>): Promise<PackageType> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('package_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating package type:', error);
    throw error;
  }

  return data;
}

// Delete a package type (admin only)
export async function deletePackageType(id: string): Promise<void> {
  const supabase = createClient();
  
  // First check if any packages are using this type
  const { data: packagesUsingType, error: checkError } = await supabase
    .from('packages')
    .select('id')
    .eq('package_type_id', id)
    .limit(1);

  if (checkError) {
    console.error('Error checking package type usage:', checkError);
    throw checkError;
  }

  if (packagesUsingType && packagesUsingType.length > 0) {
    throw new Error('Cannot delete package type that is being used by packages');
  }

  const { error } = await supabase
    .from('package_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting package type:', error);
    throw error;
  }
}

// Toggle package type active status
export async function togglePackageTypeStatus(id: string): Promise<PackageType> {
  const supabase = createClient();
  
  // First get current status
  const { data: current, error: fetchError } = await supabase
    .from('package_types')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching current status:', fetchError);
    throw fetchError;
  }

  // Toggle the status
  const { data, error } = await supabase
    .from('package_types')
    .update({ 
      is_active: !current.is_active, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling package type status:', error);
    throw error;
  }

  return data;
}