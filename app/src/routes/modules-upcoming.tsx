import { Inbox, CalendarCheck, Building2, Receipt } from 'lucide-react'
import { ModulePlaceholder } from './coming-soon'

/** Roadmap modules from the design mockups (spec 005 FR-005 revised). */

export function EnquiriesPlaceholder() {
  return (
    <ModulePlaceholder
      icon={<Inbox size={40} />}
      title="Enquiries"
      description="The client enquiry pipeline — every incoming request tracked from first contact to a confirmed booking or a recorded loss."
      planned={[
        'Pipeline stages: New · Quoted · Confirmed · Lost',
        'Enquiries linked to speakers and clients',
        'Quote history and follow-up reminders',
        'Conversion figures on the dashboard',
      ]}
    />
  )
}

export function BookingsPlaceholder() {
  return (
    <ModulePlaceholder
      icon={<CalendarCheck size={40} />}
      title="Bookings"
      description="Confirmed engagements — dates, venues, fees and contracts, connected to speaker availability."
      planned={[
        'Booking records linked to enquiries and speakers',
        'Engagement dates driving speaker availability',
        'Fee and contract tracking per booking',
        'Calendar view across the roster',
      ]}
    />
  )
}

export function ClientsPlaceholder() {
  return (
    <ModulePlaceholder
      icon={<Building2 size={40} />}
      title="Clients"
      description="The organisations and contacts who book talent — their history, preferences and value over time."
      planned={[
        'Client records with contacts and notes',
        'Booking and enquiry history per client',
        'Repeat-business and value figures',
      ]}
    />
  )
}

export function InvoicesPlaceholder() {
  return (
    <ModulePlaceholder
      icon={<Receipt size={40} />}
      title="Invoices"
      description="Billing for confirmed bookings — raised, sent and reconciled without leaving the admin."
      planned={[
        'Invoices generated from bookings',
        'Payment status tracking',
        'Client statements and export for accounts',
      ]}
    />
  )
}
