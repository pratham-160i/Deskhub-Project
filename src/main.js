import { initTheme } from './modules/theme.js'
import { initTicketsList } from './modules/tickets.js'
import { initTicketDetail } from './modules/ticketDetail.js'
import { initDashboard } from './modules/dashboard.js'
import { initLogin } from './modules/login.js'

initTheme()

const page = document.body?.dataset?.page

switch (page) {
  case 'tickets-list':
    initTicketsList()
    break
  case 'ticket-detail':
    initTicketDetail()
    break
  case 'dashboard':
    initDashboard()
    break
  case 'login':
    initLogin()
    break
  default:
    break
}
