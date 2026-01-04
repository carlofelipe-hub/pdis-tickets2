/**
 * Access Control for PDIS Tickets
 *
 * This file contains hardcoded lists of users with specific permissions
 * in the ticketing system.
 */

// Hardcoded list of ticket approvers (3 users)
const TICKET_APPROVERS = [
  'von.mauleon@projectduo.com.ph',
  'vida.gerado@projectduo.com.ph',
  'julie.mendoza@projectduo.com.ph',
]

// Hardcoded list of users who can create tickets (15 users)
// Note: The 3 approvers above can also create tickets (vida.gerado and julie.mendoza are in both lists)
const ALLOWED_TICKET_CREATORS = [
  'torie.gequillana@projectduo.com.ph',  // Torie Gequillana
  'camila.sosito@projectduo.com.ph',     // Camila Sosito
  'thess.bunyad@projectduo.com.ph',      // Thess Bunyad
  'meann.tabilog@projectduo.com.ph',     // Meann Tabilog
  'vida.gerado@projectduo.com.ph',       // Vida Gerado (also an approver)
  'jerome.staana@projectduo.com.ph',     // Jerome Sta Ana
  'karen.vengco@projectduo.com.ph',      // Karen Vengco
  'wilda.constantino@projectduo.com.ph', // Wilda Reporada/Constantino
  'jen.ocenar@projectduo.com.ph',        // Jen Ocenar
  'tin.lapuz@projectduo.com.ph',         // Christine Lapuz
  'mavi.villanueva@projectduo.com.ph',   // Mary Anne Villanueva
  'arlene.cabato@projectduo.com.ph',     // Arlene Cabato
  'nancy.marcelo@projectduo.com.ph',     // Nancy Marcelo
  'elvin.olano@projectduo.com.ph',       // Elvin Olano
  'julie.mendoza@projectduo.com.ph',     // Julie Mendoza (also an approver)
]

/**
 * Check if a user is a ticket approver
 * @param email - User's email address
 * @returns true if user can approve tickets, false otherwise
 */
export function isTicketApprover(email: string | null | undefined): boolean {
  if (!email) return false
  return TICKET_APPROVERS.includes(email.toLowerCase())
}

/**
 * Check if a user can create tickets
 * @param email - User's email address
 * @returns true if user can create tickets, false otherwise
 */
export function canCreateTickets(email: string | null | undefined): boolean {
  if (!email) return false
  return ALLOWED_TICKET_CREATORS.includes(email.toLowerCase())
}

/**
 * Get a user-friendly error message for access denial
 * @param type - Type of access being denied ('create' or 'approve')
 * @returns User-friendly error message
 */
export function getAccessDenialReason(type: 'create' | 'approve'): string {
  if (type === 'create') {
    return 'You do not have permission to create tickets. Please contact your administrator.'
  }
  return 'You do not have permission to approve tickets. Please contact your administrator.'
}
