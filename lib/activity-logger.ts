import { createClient } from '@/utils/supabase/client'

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  target_type: string
  target_id: string
  details: any
  created_at: string
}

export type ActivityAction = 
  | 'member_created'
  | 'member_updated'
  | 'member_deleted'
  | 'package_assigned'
  | 'package_removed'
  | 'session_created'
  | 'session_updated'
  | 'session_deleted'
  | 'session_booked'
  | 'session_cancelled'
  | 'payment_created'
  | 'payment_updated'
  | 'notification_sent'
  | 'user_login'
  | 'user_logout'
  | 'settings_updated'

export class ActivityLogger {
  private supabase = createClient()

  async logActivity(
    action: ActivityAction,
    targetType: string,
    targetId: string,
    details?: any
  ): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      // Create activity log entry
      const { error } = await this.supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {},
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log activity:', error)
      }
    } catch (error) {
      console.error('Activity logging error:', error)
    }
  }

  async getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select(`
          *,
          profiles!activity_logs_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch activity logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Activity fetch error:', error)
      return []
    }
  }

  // Helper method to format activity message
  formatActivityMessage(activity: ActivityLog & { profiles?: any }): string {
    const userName = activity.profiles?.full_name || 'Unknown User'
    const details = activity.details || {}
    
    switch (activity.action) {
      case 'member_created':
        return `${userName} created member "${details.memberName}"`
      case 'member_updated':
        return `${userName} updated member "${details.memberName}"`
      case 'member_deleted':
        return `${userName} deleted member "${details.memberName}"`
      case 'package_assigned':
        return `${userName} assigned package "${details.packageName}" to ${details.memberName}`
      case 'package_removed':
        return `${userName} removed package "${details.packageName}" from ${details.memberName}`
      case 'session_created':
        return `${userName} created session "${details.sessionTitle}"`
      case 'session_updated':
        return `${userName} updated session "${details.sessionTitle}"`
      case 'session_deleted':
        return `${userName} deleted session "${details.sessionTitle}"`
      case 'session_booked':
        return `${userName} booked "${details.memberName}" for session "${details.sessionTitle}"`
      case 'session_cancelled':
        return `${userName} cancelled booking for "${details.memberName}" in session "${details.sessionTitle}"`
      case 'payment_created':
        return `${userName} created payment record for ${details.memberName} (${details.amount})`
      case 'payment_updated':
        return `${userName} updated payment status to "${details.status}" for ${details.memberName}`
      case 'notification_sent':
        return `${userName} sent notification "${details.title}" to ${details.recipientCount} users`
      case 'user_login':
        return `${userName} logged in`
      case 'user_logout':
        return `${userName} logged out`
      case 'settings_updated':
        return `${userName} updated ${details.settingCategory} settings`
      default:
        return `${userName} performed action: ${activity.action}`
    }
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger()