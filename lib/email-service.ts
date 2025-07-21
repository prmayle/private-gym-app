import { createClient } from '@/utils/supabase/client'

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface BookingEmailData {
  memberName: string
  memberEmail: string
  sessionTitle: string
  sessionDate: string
  sessionTime: string
  trainerName: string
  sessionLocation?: string
  sessionType: string
}

export interface CancellationEmailData {
  memberName: string
  memberEmail: string
  sessionTitle: string
  sessionDate: string
  sessionTime: string
  cancellationReason?: string
}

export interface PackageExpiryEmailData {
  memberName: string
  memberEmail: string
  packageName: string
  expiryDate: string
  remainingSessions: number
}

export class EmailService {
  private supabase = createClient()

  // Email template generators
  private generateBookingConfirmationTemplate(data: BookingEmailData): EmailTemplate {
    const subject = `Booking Confirmed: ${data.sessionTitle} on ${data.sessionDate}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Booking Confirmed!</h1>
        </header>
        
        <main style="padding: 20px;">
          <p>Hi ${data.memberName},</p>
          
          <p>Your session booking has been confirmed. Here are the details:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">Session Details</h2>
            <p><strong>Session:</strong> ${data.sessionTitle}</p>
            <p><strong>Type:</strong> ${data.sessionType}</p>
            <p><strong>Date:</strong> ${data.sessionDate}</p>
            <p><strong>Time:</strong> ${data.sessionTime}</p>
            <p><strong>Trainer:</strong> ${data.trainerName}</p>
            ${data.sessionLocation ? `<p><strong>Location:</strong> ${data.sessionLocation}</p>` : ''}
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What to Bring</h3>
            <ul style="margin: 0;">
              <li>Water bottle</li>
              <li>Towel</li>
              <li>Comfortable workout attire</li>
              <li>Athletic shoes</li>
            </ul>
          </div>
          
          <p>We're looking forward to seeing you! If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
          
          <p>Best regards,<br>The Gym Team</p>
        </main>
        
        <footer style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </footer>
      </div>
    `

    const text = `
Booking Confirmed: ${data.sessionTitle}

Hi ${data.memberName},

Your session booking has been confirmed:

Session: ${data.sessionTitle}
Type: ${data.sessionType}
Date: ${data.sessionDate}
Time: ${data.sessionTime}
Trainer: ${data.trainerName}
${data.sessionLocation ? `Location: ${data.sessionLocation}` : ''}

What to bring:
- Water bottle
- Towel
- Comfortable workout attire
- Athletic shoes

We're looking forward to seeing you! If you need to cancel or reschedule, please contact us at least 24 hours in advance.

Best regards,
The Gym Team
    `

    return { subject, html, text }
  }

  private generateCancellationTemplate(data: CancellationEmailData): EmailTemplate {
    const subject = `Session Cancelled: ${data.sessionTitle} on ${data.sessionDate}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Session Cancelled</h1>
        </header>
        
        <main style="padding: 20px;">
          <p>Hi ${data.memberName},</p>
          
          <p>We're sorry to inform you that your upcoming session has been cancelled:</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="color: #dc2626; margin-top: 0;">Cancelled Session</h2>
            <p><strong>Session:</strong> ${data.sessionTitle}</p>
            <p><strong>Date:</strong> ${data.sessionDate}</p>
            <p><strong>Time:</strong> ${data.sessionTime}</p>
            ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">What happens next?</h3>
            <ul style="margin: 0;">
              <li>Your session credit has been restored to your package</li>
              <li>You can book a replacement session immediately</li>
              <li>Contact us if you need help rebooking</li>
            </ul>
          </div>
          
          <p>We apologize for any inconvenience. Please contact us if you have any questions or need assistance with rebooking.</p>
          
          <p>Best regards,<br>The Gym Team</p>
        </main>
        
        <footer style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </footer>
      </div>
    `

    const text = `
Session Cancelled: ${data.sessionTitle}

Hi ${data.memberName},

We're sorry to inform you that your upcoming session has been cancelled:

Session: ${data.sessionTitle}
Date: ${data.sessionDate}
Time: ${data.sessionTime}
${data.cancellationReason ? `Reason: ${data.cancellationReason}` : ''}

What happens next?
- Your session credit has been restored to your package
- You can book a replacement session immediately
- Contact us if you need help rebooking

We apologize for any inconvenience. Please contact us if you have any questions.

Best regards,
The Gym Team
    `

    return { subject, html, text }
  }

  private generatePackageExpiryTemplate(data: PackageExpiryEmailData): EmailTemplate {
    const subject = `Package Expiring Soon: ${data.packageName}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Package Expiring Soon</h1>
        </header>
        
        <main style="padding: 20px;">
          <p>Hi ${data.memberName},</p>
          
          <p>This is a friendly reminder that your package is expiring soon:</p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="color: #92400e; margin-top: 0;">Package Details</h2>
            <p><strong>Package:</strong> ${data.packageName}</p>
            <p><strong>Expiry Date:</strong> ${data.expiryDate}</p>
            <p><strong>Sessions Remaining:</strong> ${data.remainingSessions}</p>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Don't Let Your Sessions Go to Waste!</h3>
            <ul style="margin: 0;">
              <li>Book your remaining sessions before they expire</li>
              <li>Consider renewing your package for continued access</li>
              <li>Contact us about package extensions if needed</li>
            </ul>
          </div>
          
          <p>To book your remaining sessions or renew your package, please contact us or log into your member portal.</p>
          
          <p>Best regards,<br>The Gym Team</p>
        </main>
        
        <footer style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </footer>
      </div>
    `

    const text = `
Package Expiring Soon: ${data.packageName}

Hi ${data.memberName},

This is a friendly reminder that your package is expiring soon:

Package: ${data.packageName}
Expiry Date: ${data.expiryDate}
Sessions Remaining: ${data.remainingSessions}

Don't let your sessions go to waste!
- Book your remaining sessions before they expire
- Consider renewing your package for continued access
- Contact us about package extensions if needed

To book your remaining sessions or renew your package, please contact us or log into your member portal.

Best regards,
The Gym Team
    `

    return { subject, html, text }
  }

  // Log email to database
  private async logEmail(
    recipientEmail: string,
    templateName: string,
    subject: string,
    status: 'sent' | 'failed' = 'sent',
    failReason?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('email_logs')
        .insert({
          recipient_email: recipientEmail,
          template_name: templateName,
          subject: subject,
          status: status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          failed_reason: failReason,
          metadata: {}
        })

      if (error) {
        console.error('Failed to log email:', error)
      }
    } catch (error) {
      console.error('Email logging error:', error)
    }
  }

  // Main email sending methods
  async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    try {
      const template = this.generateBookingConfirmationTemplate(data)
      
      // TODO: Replace with actual email service (Resend, SendGrid, etc.)
      // For now, we'll simulate sending and log to database
      console.log('📧 Booking confirmation email would be sent to:', data.memberEmail)
      console.log('Subject:', template.subject)
      console.log('HTML:', template.html)
      
      await this.logEmail(
        data.memberEmail,
        'booking_confirmation',
        template.subject,
        'sent'
      )
      
      return true
    } catch (error) {
      console.error('Failed to send booking confirmation:', error)
      await this.logEmail(
        data.memberEmail,
        'booking_confirmation',
        `Booking Confirmed: ${data.sessionTitle}`,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  async sendCancellationNotice(data: CancellationEmailData): Promise<boolean> {
    try {
      const template = this.generateCancellationTemplate(data)
      
      // TODO: Replace with actual email service
      console.log('📧 Cancellation email would be sent to:', data.memberEmail)
      console.log('Subject:', template.subject)
      
      await this.logEmail(
        data.memberEmail,
        'session_cancellation',
        template.subject,
        'sent'
      )
      
      return true
    } catch (error) {
      console.error('Failed to send cancellation notice:', error)
      await this.logEmail(
        data.memberEmail,
        'session_cancellation',
        `Session Cancelled: ${data.sessionTitle}`,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  async sendPackageExpiryWarning(data: PackageExpiryEmailData): Promise<boolean> {
    try {
      const template = this.generatePackageExpiryTemplate(data)
      
      // TODO: Replace with actual email service
      console.log('📧 Package expiry email would be sent to:', data.memberEmail)
      console.log('Subject:', template.subject)
      
      await this.logEmail(
        data.memberEmail,
        'package_expiry_warning',
        template.subject,
        'sent'
      )
      
      return true
    } catch (error) {
      console.error('Failed to send package expiry warning:', error)
      await this.logEmail(
        data.memberEmail,
        'package_expiry_warning',
        `Package Expiring Soon: ${data.packageName}`,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  // Batch email methods for multiple recipients
  async sendBulkCancellationNotices(
    sessionTitle: string,
    sessionDate: string,
    sessionTime: string,
    members: Array<{ name: string; email: string }>,
    cancellationReason?: string
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0
    let failed = 0

    for (const member of members) {
      const success = await this.sendCancellationNotice({
        memberName: member.name,
        memberEmail: member.email,
        sessionTitle,
        sessionDate,
        sessionTime,
        cancellationReason
      })

      if (success) {
        successful++
      } else {
        failed++
      }

      // Add small delay to avoid overwhelming the email service
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { successful, failed }
  }
}

// Export singleton instance
export const emailService = new EmailService()