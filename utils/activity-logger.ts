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
 * Log an activity to the notifications table (repurposed for activity logging)
 * This allows us to track all activities in the dashboard
 */
export async function logActivity(activity: ActivityLogInsert): Promise<void> {
  try {
    const supabase = createClient()

    // Use notifications table for activity logging with specific format
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: activity.performed_by,
        title: `${activity.action_type.toUpperCase()}: ${activity.entity_type}`,
        message: activity.description,
        type: 'system', // Using system type for activity logs
        is_read: false,
        metadata: {
          activity_log: true,
          action_type: activity.action_type,
          entity_type: activity.entity_type,
          entity_id: activity.entity_id,
          entity_name: activity.entity_name,
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
      .from('notifications')
      .select('*')
      .eq('type', 'system')
      .not('metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch activities:', error)
      return []
    }

    return (data || [])
      .filter(notification => notification.metadata?.activity_log === true)
      .map(notification => ({
        id: notification.id,
        action_type: notification.metadata.action_type,
        entity_type: notification.metadata.entity_type,
        entity_id: notification.metadata.entity_id,
        entity_name: notification.metadata.entity_name,
        description: notification.message,
        performed_by: notification.user_id,
        metadata: notification.metadata,
        created_at: notification.created_at
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