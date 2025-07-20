import { SupabaseClient } from '@supabase/supabase-js'

// Define the Database interface for TypeScript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'admin' | 'member' | 'trainer'
          avatar_url: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'member' | 'trainer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'member' | 'trainer'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      members: {
        Row: {
          id: string
          user_id: string
          emergency_contact: string | null
          medical_conditions: string | null
          date_of_birth: string | null
          gender: string | null
          address: string | null
          height: number | null
          weight: number | null
          profile_photo_url: string | null
          joined_at: string
          membership_status: 'active' | 'expired' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          emergency_contact?: string | null
          medical_conditions?: string | null
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          height?: number | null
          weight?: number | null
          profile_photo_url?: string | null
          joined_at?: string
          membership_status?: 'active' | 'expired' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          emergency_contact?: string | null
          medical_conditions?: string | null
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          height?: number | null
          weight?: number | null
          profile_photo_url?: string | null
          joined_at?: string
          membership_status?: 'active' | 'expired' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      packages: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          duration_days: number | null
          session_count: number | null
          package_type: 'monthly' | 'quarterly' | 'yearly' | 'session_based'
          features: any | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          duration_days?: number | null
          session_count?: number | null
          package_type: 'monthly' | 'quarterly' | 'yearly' | 'session_based'
          features?: any | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          duration_days?: number | null
          session_count?: number | null
          package_type?: 'monthly' | 'quarterly' | 'yearly' | 'session_based'
          features?: any | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          title: string
          description: string | null
          trainer_id: string | null
          max_capacity: number
          start_time: string
          end_time: string
          session_type: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          price: number | null
          created_at: string
          updated_at: string
          current_bookings: number
          location: string | null
          equipment_needed: string[] | null
          is_recurring: boolean
          recurrence_rule: string | null
          recurrence_end_date: string | null
          original_session_id: string | null
          template_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          trainer_id?: string | null
          max_capacity?: number
          start_time: string
          end_time: string
          session_type: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          price?: number | null
          created_at?: string
          updated_at?: string
          current_bookings?: number
          location?: string | null
          equipment_needed?: string[] | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          original_session_id?: string | null
          template_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          trainer_id?: string | null
          max_capacity?: number
          start_time?: string
          end_time?: string
          session_type?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          price?: number | null
          created_at?: string
          updated_at?: string
          current_bookings?: number
          location?: string | null
          equipment_needed?: string[] | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          original_session_id?: string | null
          template_id?: string | null
        }
      }
      member_packages: {
        Row: {
          id: string
          member_id: string
          package_id: string
          start_date: string
          end_date: string | null
          sessions_remaining: number | null
          status: 'active' | 'expired' | 'suspended'
          purchased_at: string
          created_at: string
          updated_at: string
          sessions_total: number
          activated_at: string | null
          auto_renew: boolean
        }
        Insert: {
          id?: string
          member_id: string
          package_id: string
          start_date: string
          end_date?: string | null
          sessions_remaining?: number | null
          status?: 'active' | 'expired' | 'suspended'
          purchased_at?: string
          created_at?: string
          updated_at?: string
          sessions_total?: number
          activated_at?: string | null
          auto_renew?: boolean
        }
        Update: {
          id?: string
          member_id?: string
          package_id?: string
          start_date?: string
          end_date?: string | null
          sessions_remaining?: number | null
          status?: 'active' | 'expired' | 'suspended'
          purchased_at?: string
          created_at?: string
          updated_at?: string
          sessions_total?: number
          activated_at?: string | null
          auto_renew?: boolean
        }
      }
      trainers: {
        Row: {
          id: string
          user_id: string
          specializations: string[] | null
          certifications: string[] | null
          bio: string | null
          hourly_rate: number | null
          profile_photo_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
          experience_years: number
          hire_date: string
          max_sessions_per_day: number
        }
        Insert: {
          id?: string
          user_id: string
          specializations?: string[] | null
          certifications?: string[] | null
          bio?: string | null
          hourly_rate?: number | null
          profile_photo_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
          experience_years?: number
          hire_date?: string
          max_sessions_per_day?: number
        }
        Update: {
          id?: string
          user_id?: string
          specializations?: string[] | null
          certifications?: string[] | null
          bio?: string | null
          hourly_rate?: number | null
          profile_photo_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
          experience_years?: number
          hire_date?: string
          max_sessions_per_day?: number
        }
      }
      bookings: {
        Row: {
          id: string
          member_id: string
          session_id: string
          member_package_id: string | null
          booking_time: string
          status: 'confirmed' | 'pending' | 'cancelled' | 'attended'
          notes: string | null
          attended: boolean
          created_at: string
          updated_at: string
          attendance_time: string | null
          cancelled_at: string | null
          rating: number | null
          feedback: string | null
          check_in_time: string | null
          check_out_time: string | null
          late_arrival: boolean
          early_departure: boolean
        }
        Insert: {
          id?: string
          member_id: string
          session_id: string
          member_package_id?: string | null
          booking_time?: string
          status?: 'confirmed' | 'pending' | 'cancelled' | 'attended'
          notes?: string | null
          attended?: boolean
          created_at?: string
          updated_at?: string
          attendance_time?: string | null
          cancelled_at?: string | null
          rating?: number | null
          feedback?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          late_arrival?: boolean
          early_departure?: boolean
        }
        Update: {
          id?: string
          member_id?: string
          session_id?: string
          member_package_id?: string | null
          booking_time?: string
          status?: 'confirmed' | 'pending' | 'cancelled' | 'attended'
          notes?: string | null
          attended?: boolean
          created_at?: string
          updated_at?: string
          attendance_time?: string | null
          cancelled_at?: string | null
          rating?: number | null
          feedback?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          late_arrival?: boolean
          early_departure?: boolean
        }
      }
      gym_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          description?: string | null
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          meta_title: string | null
          meta_description: string | null
          is_published: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          meta_title?: string | null
          meta_description?: string | null
          is_published?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          meta_title?: string | null
          meta_description?: string | null
          is_published?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sections: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      page_sections: {
        Row: {
          id: string
          page_id: string
          section_id: string
          sort_order: number
          is_enabled: boolean
          content_data: any
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          page_id: string
          section_id: string
          sort_order: number
          is_enabled?: boolean
          content_data?: any
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          section_id?: string
          sort_order?: number
          is_enabled?: boolean
          content_data?: any
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      features: {
        Row: {
          id: string
          title: string
          description: string
          icon: string
          sort_order: number
          is_active: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          icon: string
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      testimonials: {
        Row: {
          id: string
          name: string
          role: string
          content: string
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          content: string
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          content?: string
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      global_settings: {
        Row: {
          id: string
          category: string
          setting_key: string
          setting_value: any
          data_type: string
          description: string | null
          is_public: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          setting_key: string
          setting_value: any
          data_type: string
          description?: string | null
          is_public?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: string
          setting_key?: string
          setting_value?: any
          data_type?: string
          description?: string | null
          is_public?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          target_type: string
          target_id: string
          details: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          target_type: string
          target_id: string
          details?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: any
          created_at?: string
        }
      }
      slider_images: {
        Row: {
          id: string
          section_name: string
          image_url: string
          title: string | null
          subtitle: string | null
          sort_order: number
          is_active: boolean
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          section_name: string
          image_url: string
          title?: string | null
          subtitle?: string | null
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          section_name?: string
          image_url?: string
          title?: string | null
          subtitle?: string | null
          sort_order?: number
          is_active?: boolean
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'member' | 'trainer'
      membership_status: 'active' | 'expired' | 'suspended'
      session_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      booking_status: 'confirmed' | 'pending' | 'cancelled' | 'attended'
      package_type: 'monthly' | 'quarterly' | 'yearly' | 'session_based'
      payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
      notification_type: 'booking' | 'payment' | 'reminder' | 'system'
    }
  }
}

// Helper types following Supabase TypeScript best practices
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types for easier usage
export type UserProfile = Tables<'profiles'>
export type MemberProfile = Tables<'members'>
export type Package = Tables<'packages'>
export type Session = Tables<'sessions'>
export type MemberPackage = Tables<'member_packages'>
export type Trainer = Tables<'trainers'>
export type Booking = Tables<'bookings'>
export type GymSetting = Tables<'gym_settings'>
export type Page = Tables<'pages'>
export type Section = Tables<'sections'>
export type PageSection = Tables<'page_sections'>
export type Feature = Tables<'features'>
export type Testimonial = Tables<'testimonials'>
export type GlobalSetting = Tables<'global_settings'>
export type SliderImage = Tables<'slider_images'>

// Flexible type for Supabase client - fixes linter errors
export type TypedSupabaseClient = ReturnType<typeof import('@/utils/supabase/client').createClient>

// Helper functions for common database operations with proper typing and optimization
export const getUserProfile = async (supabase: TypedSupabaseClient, userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getMemberProfile = async (supabase: TypedSupabaseClient, userId: string): Promise<MemberProfile> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getGymSettings = async (supabase: TypedSupabaseClient): Promise<GymSetting[]> => {
  const { data, error } = await supabase
    .from('gym_settings')
    .select('*')
    .order('setting_key')
  
  if (error) throw error
  return data || []
}

export const getActivePackages = async (supabase: TypedSupabaseClient): Promise<Package[]> => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })
  
  if (error) throw error
  return data || []
}

// Optimized home page configuration loader with caching
export const getHomePageConfig = async (supabase: TypedSupabaseClient) => {
  try {
    console.log('🔍 Getting optimized home page config...')
    
    // First ensure home page exists
    const homePageId = await ensureHomePageExists(supabase)
    
    // Single optimized query with joins
    const [sectionsResult, featuresResult, testimonialsResult, trainersResult] = await Promise.all([
      // Get page sections with proper join
      supabase
        .from('page_sections')
        .select(`
          id,
          content_data,
          sort_order,
          sections!inner (
            name,
            display_name
          )
        `)
        .eq('page_id', homePageId)
        .eq('is_enabled', true)
        .order('sort_order'),
      
      // Get features with minimal data
      supabase
        .from('features')
        .select('id, title, description, icon, sort_order')
        .eq('is_active', true)
        .order('sort_order')
        .limit(10), // Limit to prevent over-fetching
      
      // Get testimonials with minimal data
      supabase
        .from('testimonials')
        .select('id, name, role, content, image_url, sort_order')
        .eq('is_active', true)
        .order('sort_order')
        .limit(10), // Limit to prevent over-fetching
      
      // Get trainers with minimal data
      supabase
        .from('trainers')
        .select(`
          id,
          bio,
          specializations,
          profile_photo_url,
          is_available,
          profiles!inner (
            full_name
          )
        `)
        .eq('is_available', true)
        .limit(10) // Limit to prevent over-fetching
    ])

    // Handle errors gracefully
    if (sectionsResult.error) {
      console.warn('Sections query error:', sectionsResult.error)
    }
    if (featuresResult.error) {
      console.warn('Features query error:', featuresResult.error)
    }
    if (testimonialsResult.error) {
      console.warn('Testimonials query error:', testimonialsResult.error)
    }
    if (trainersResult.error) {
      console.warn('Trainers query error:', trainersResult.error)
    }

    // Build config object efficiently
    const config: any = {}
    
    // Process sections
    if (sectionsResult.data) {
      for (const section of sectionsResult.data) {
        const sectionName = (section.sections as any)?.name
        if (sectionName && section.content_data) {
          config[sectionName] = section.content_data
        }
      }
    }

    // Process features (keep as UUID strings, don't convert to int)
    if (featuresResult.data) {
      const featuresSection = config.features || {}
      config.features = {
        title: featuresSection.title || "Our Services",
        subtitle: featuresSection.subtitle || "Discover what we offer",
        features: featuresResult.data.map(f => ({
          id: f.id, // Keep as UUID string
          title: f.title,
          description: f.description,
          icon: f.icon
        }))
      }
    }

    // Process testimonials (keep as UUID strings, don't convert to int)
    if (testimonialsResult.data) {
      const testimonialsSection = config.testimonials || {}
      config.testimonials = {
        title: testimonialsSection.title || "What Our Members Say",
        subtitle: testimonialsSection.subtitle || "Success stories from our community",
        testimonials: testimonialsResult.data.map(t => ({
          id: t.id, // Keep as UUID string
          name: t.name,
          role: t.role,
          content: t.content,
          image: t.image_url || "/uploads/home-config/placeholder-testimonial.jpg"
        }))
      }
    }

    // Process trainers (keep as UUID strings, don't convert to int)
    if (trainersResult.data) {
      const trainersSection = config.trainers || {}
      config.trainers = {
        title: trainersSection.title || "Our Expert Trainers",
        subtitle: trainersSection.subtitle || "Meet the professionals who will guide your fitness journey",
        trainers: trainersResult.data.map(t => ({
          id: t.id, // Keep as UUID string
          name: (t.profiles as any)?.full_name || "",
          bio: t.bio || "",
          specializations: Array.isArray(t.specializations) ? t.specializations.join(", ") : (t.specializations || ""),
          profilePhotoUrl: t.profile_photo_url || "/placeholder.svg",
          isAvailable: t.is_available || false
        }))
      }
    }

    console.log('✅ Optimized home page config loaded')
    return config

  } catch (err) {
    console.error('❌ Database query failed:', err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}

// Helper function to ensure home page exists
const ensureHomePageExists = async (supabase: TypedSupabaseClient): Promise<string> => {
  try {
    // Check if home page exists
    let { data: homePage, error } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', 'home')
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!homePage) {
      // Create home page
      const { data: newPage, error: createError } = await supabase
        .from('pages')
        .insert({
          slug: 'home',
          title: 'Home Page',
          description: 'Main home page configuration',
          is_published: true
        })
        .select('id')
        .single()

      if (createError) throw createError
      homePage = newPage
    }

    return homePage.id
  } catch (err) {
    console.error('Error ensuring home page exists:', err)
    throw err
  }
}

// Update section content using direct table approach
export const updateSectionContent = async (
  supabase: TypedSupabaseClient,
  sectionName: string,
  contentData: any
) => {
  try {
    console.log(`🔄 Updating section content for ${sectionName}:`, contentData)
    
    // Get the home page ID
    const homePageId = await ensureHomePageExists(supabase)
    console.log(`📝 Using home page ID: ${homePageId}`)
    
    // First, find or create the section
    let { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('id')
      .eq('name', sectionName)
      .maybeSingle()

    if (sectionError && sectionError.code !== 'PGRST116') {
      throw sectionError
    }

    if (!section) {
      // Section doesn't exist, create it
      console.log(`🆕 Creating new section: ${sectionName}`)
      const { data: newSection, error: createError } = await supabase
        .from('sections')
        .insert({
          name: sectionName,
          display_name: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
          description: `${sectionName} section configuration`,
          is_active: true
        })
        .select('id')
        .single()

      if (createError) {
        console.error('❌ Section creation error:', createError)
        throw createError
      }
      section = newSection
      console.log(`✅ Created section:`, section)
    } else {
      console.log(`✅ Found existing section:`, section)
    }

    // Check if page section already exists
    console.log(`🔍 Checking for existing page section: page_id=${homePageId}, section_id=${section.id}`)
    const { data: existingPageSection, error: checkError } = await supabase
      .from('page_sections')
      .select('id')
      .eq('page_id', homePageId)
      .eq('section_id', section.id)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking existing page section:', checkError)
      throw checkError
    }

    let result
    if (existingPageSection) {
      // Update existing
      console.log(`📝 Updating existing page section: ${existingPageSection.id}`)
      const { data, error } = await supabase
        .from('page_sections')
        .update({
          content_data: contentData,
          is_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPageSection.id)
        .select()
      
      if (error) {
        console.error('❌ Update error:', error)
        throw error
      }
      result = data
      console.log(`✅ Updated page section successfully`)
    } else {
      // Insert new
      console.log(`🆕 Inserting new page section`)
      const { data, error } = await supabase
        .from('page_sections')
        .insert({
          page_id: homePageId,
          section_id: section.id,
          content_data: contentData,
          is_enabled: true,
          sort_order: 0
        })
        .select()
      
      if (error) {
        console.error('❌ Insert error:', error)
        throw error
      }
      result = data
      console.log(`✅ Inserted new page section successfully`)
    }
    console.log(`✅ Section ${sectionName} updated successfully`)
    return result
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ Update failed for ${sectionName}:`, {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      sectionName,
      contentData
    })
    throw new Error(`Failed to update ${sectionName}: ${errorMessage}`)
  }
}


// Single feature upsert using direct table approach
export const upsertFeature = async (
  supabase: TypedSupabaseClient,
  feature: {
    id?: string
    title: string
    description: string
    icon: string
    sort_order?: number
  }
) => {
  try {
    console.log('🔄 Upserting feature:', feature)
    
    const { data, error } = await supabase
      .from('features')
      .upsert({
        id: feature.id || undefined,
        title: feature.title,
        description: feature.description,
        icon: feature.icon,
        sort_order: feature.sort_order || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    console.log('✅ Feature upserted successfully:', data)
    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Feature upsert failed:', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      feature
    })
    throw new Error(`Failed to upsert feature: ${errorMessage}`)
  }
}

// Optimized feature deletion
export const deleteFeature = async (
  supabase: TypedSupabaseClient,
  featureId: string
) => {
  try {
    const { error } = await supabase
      .from('features')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', featureId)
    
    if (error) throw error
  } catch (err) {
    console.warn('Feature deletion failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}


// Single testimonial upsert using direct table approach
export const upsertTestimonial = async (
  supabase: TypedSupabaseClient,
  testimonial: {
    id?: string
    name: string
    role: string
    content: string
    image_url?: string
    sort_order?: number
  }
) => {
  try {
    console.log('🔄 Upserting testimonial:', testimonial)
    
    const { data, error } = await supabase
      .from('testimonials')
      .upsert({
        id: testimonial.id || undefined,
        name: testimonial.name,
        role: testimonial.role,
        content: testimonial.content,
        image_url: testimonial.image_url || null,
        sort_order: testimonial.sort_order || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    console.log('✅ Testimonial upserted successfully:', data)
    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Testimonial upsert failed:', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      testimonial
    })
    throw new Error(`Failed to upsert testimonial: ${errorMessage}`)
  }
}

// Optimized testimonial deletion
export const deleteTestimonial = async (
  supabase: TypedSupabaseClient,
  testimonialId: string
) => {
  try {
    const { error } = await supabase
      .from('testimonials')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
    
    if (error) throw error
  } catch (err) {
    console.warn('Testimonial deletion failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Bulk update multiple sections using new database structure
export const updateMultipleSections = async (
  supabase: TypedSupabaseClient,
  sections: Array<{
    sectionName: string
    contentData: any
  }>
) => {
  if (!sections.length) return []
  
  try {
    const results = await Promise.allSettled(
      sections.map(section => 
        updateSectionContent(supabase, section.sectionName, section.contentData)
      )
    )
    
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} section updates failed`)
    }
    
    return results
  } catch (err) {
    console.warn('Bulk section update failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Bulk update features using database functions
export const upsertFeatures = async (
  supabase: TypedSupabaseClient,
  features: Array<{
    id?: string
    title: string
    description: string
    icon: string
    sort_order?: number
  }>
) => {
  if (!features.length) return []
  
  try {
    const results = await Promise.allSettled(
      features.map(feature => upsertFeature(supabase, feature))
    )
    
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} feature updates failed`)
    }
    
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  } catch (err) {
    console.warn('Bulk feature update failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Bulk update testimonials using database functions
export const upsertTestimonials = async (
  supabase: TypedSupabaseClient,
  testimonials: Array<{
    id?: string
    name: string
    role: string
    content: string
    image_url?: string
    sort_order?: number
  }>
) => {
  if (!testimonials.length) return []
  
  try {
    const results = await Promise.allSettled(
      testimonials.map(testimonial => upsertTestimonial(supabase, testimonial))
    )
    
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} testimonial updates failed`)
    }
    
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  } catch (err) {
    console.warn('Bulk testimonial update failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Bulk update global settings
export const setGlobalSettings = async (
  supabase: TypedSupabaseClient,
  settings: Array<{
    category: string
    key: string
    value: any
    dataType?: string
  }>
) => {
  if (!settings.length) return []
  
  try {
    const results = await Promise.allSettled(
      settings.map(setting => 
        setGlobalSetting(supabase, setting.category, setting.key, setting.value, setting.dataType)
      )
    )
    
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn(`${failures.length} global setting updates failed`)
    }
    
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  } catch (err) {
    console.warn('Bulk global settings update failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Single setting function using database function
export const setGlobalSetting = async (
  supabase: TypedSupabaseClient,
  category: string,
  key: string,
  value: any,
  dataType: string = 'object'
) => {
  try {
    const { data, error } = await supabase.rpc('set_global_setting', {
      category_param: category,
      key_param: key,
      value_param: value,
      data_type_param: dataType
    })
    
    if (error) throw error
    return data
  } catch (err) {
    console.warn('Global setting update failed:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

// Slider Image Helper Functions

// Get slider images for a specific section
export const getSliderImages = async (
  supabase: TypedSupabaseClient,
  sectionName: string
): Promise<SliderImage[]> => {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .select('*')
      .eq('section_name', sectionName)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error(`Failed to get slider images for ${sectionName}:`, err)
    return []
  }
}

// Upsert a slider image
export const upsertSliderImage = async (
  supabase: TypedSupabaseClient,
  image: {
    id?: string
    sectionName: string
    imageUrl: string
    sortOrder?: number
  }
) => {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .upsert({
        id: image.id || undefined,
        section_name: image.sectionName,
        image_url: image.imageUrl,
        title: null,
        subtitle: null,
        sort_order: image.sortOrder || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to upsert slider image:', errorMessage)
    throw new Error(`Failed to upsert slider image: ${errorMessage}`)
  }
}

// Delete a slider image (soft delete)
export const deleteSliderImage = async (
  supabase: TypedSupabaseClient,
  imageId: string
) => {
  try {
    const { error } = await supabase
      .from('slider_images')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId)

    if (error) throw error
  } catch (err) {
    console.error('Failed to delete slider image:', err)
    throw err
  }
}

// Update slider image order
export const updateSliderImageOrder = async (
  supabase: TypedSupabaseClient,
  imageId: string,
  newOrder: number
) => {
  try {
    const { error } = await supabase
      .from('slider_images')
      .update({
        sort_order: newOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId)

    if (error) throw error
  } catch (err) {
    console.error('Failed to update slider image order:', err)
    throw err
  }
}

// Get all slider images (for admin interface)
export const getAllSliderImages = async (
  supabase: TypedSupabaseClient
): Promise<SliderImage[]> => {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .select('*')
      .eq('is_active', true)
      .order('section_name', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to get all slider images:', err)
    return []
  }
} 
