import { createClient } from '@/utils/supabase/client'

export interface ActivityLog {
  id?: string
  action_type: 'create' | 'update' | 'delete' | 'booking' | 'payment' | 'session' | 'member' | 'trainer'
  entity_type: 'package' | 'session' | 'member' | 'booking' | 'payment' | 'trainer'
  entity_id: string
  entity_name: string
  description: string
  performed_by: string
  metadata?: any
  created_at?: string
}

export interface ActivityLogInsert {
  action_type: ActivityLog['action_type']
  entity_type: ActivityLog['entity_type']
  entity_id: string
  entity_name: string
  description: string
  performed_by: string
  metadata?: any
}

/**
 * Log an activity to the activity_logs table
 * This allows us to track all activities in the dashboard
 */
export async function logActivity(activity: ActivityLogInsert): Promise<void> {
  try {
    const supabase = createClient()

    // Use activity_logs table for proper activity logging
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: activity.performed_by,
        action: `${activity.action_type.toUpperCase()}: ${activity.entity_type}`,
        target_type: activity.entity_type,
        target_id: activity.entity_id,
        details: {
          entity_name: activity.entity_name,
          description: activity.description,
          action_type: activity.action_type,
          timestamp: new Date().toISOString(),
          ...activity.metadata
        }
      })

    if (error) {
      console.error('Failed to log activity:', error)
      // Don't throw - activity logging shouldn't break main operations
    }
  } catch (error) {
    console.error('Activity logging error:', error)
    // Don't throw - activity logging shouldn't break main operations
  }
}

/**
 * Get recent activities for dashboard display
 */
export async function getRecentActivities(limit: number = 20): Promise<ActivityLog[]> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch activities:', error)
      return []
    }

    return (data || []).map(log => ({
      id: log.id,
      action_type: log.details?.action_type || 'unknown',
      entity_type: log.target_type,
      entity_id: log.target_id,
      entity_name: log.details?.entity_name || 'Unknown',
      description: log.details?.description || log.action,
      performed_by: log.user_id,
      metadata: log.details,
      created_at: log.created_at
    }))
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

/**
 * Activity logging helpers for common operations
 */
export const ActivityLogger = {
  // Package operations
  packageCreated: (packageName: string, memberName: string, entityId: string, performedBy: string) =>
    logActivity({
      action_type: 'create',
      entity_type: 'package',
      entity_id: entityId,
      entity_name: packageName,
      description: `Package "${packageName}" assigned to ${memberName}`,
      performed_by: performedBy,
      metadata: { member_name: memberName }
    }),

  packageUpdated: (packageName: string, entityId: string, performedBy: string, changes?: any) =>
    logActivity({
      action_type: 'update',
      entity_type: 'package',
      entity_id: entityId,
      entity_name: packageName,
      description: `Package "${packageName}" updated`,
      performed_by: performedBy,
      metadata: { changes }
    }),

  // Session operations
  sessionCreated: (sessionTitle: string, entityId: string, performedBy: string, trainer?: string) =>
    logActivity({
      action_type: 'create',
      entity_type: 'session',
      entity_id: entityId,
      entity_name: sessionTitle,
      description: `Session "${sessionTitle}" created${trainer ? ` with trainer ${trainer}` : ''}`,
      performed_by: performedBy,
      metadata: { trainer }
    }),

  sessionBooked: (sessionTitle: string, memberName: string, entityId: string, performedBy: string) =>
    logActivity({
      action_type: 'booking',
      entity_type: 'session',
      entity_id: entityId,
      entity_name: sessionTitle,
      description: `${memberName} booked for session "${sessionTitle}"`,
      performed_by: performedBy,
      metadata: { member_name: memberName }
    }),

  // Member operations
  memberCreated: (memberName: string, entityId: string, performedBy: string) =>
    logActivity({
      action_type: 'create',
      entity_type: 'member',
      entity_id: entityId,
      entity_name: memberName,
      description: `New member "${memberName}" registered`,
      performed_by: performedBy
    }),

  // Trainer operations  
  trainerCreated: (trainerName: string, entityId: string, performedBy: string) =>
    logActivity({
      action_type: 'create',
      entity_type: 'trainer',
      entity_id: entityId,
      entity_name: trainerName,
      description: `New trainer "${trainerName}" added`,
      performed_by: performedBy
    }),

  trainerUpdated: (trainerName: string, entityId: string, performedBy: string, changes?: any) =>
    logActivity({
      action_type: 'update',
      entity_type: 'trainer',
      entity_id: entityId,
      entity_name: trainerName,
      description: `Trainer "${trainerName}" profile updated`,
      performed_by: performedBy,
      metadata: { changes }
    }),

  // Payment operations
  paymentCompleted: (packageName: string, memberName: string, amount: number, entityId: string, performedBy: string) =>
    logActivity({
      action_type: 'payment',
      entity_type: 'payment',
      entity_id: entityId,
      entity_name: `${memberName} - ${packageName}`,
      description: `Payment of $${amount} completed for ${memberName}'s ${packageName} package`,
      performed_by: performedBy,
      metadata: { member_name: memberName, package_name: packageName, amount }
    })
}