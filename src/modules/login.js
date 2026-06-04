import { login, getToken } from '../api/auth.js'
import { toast } from './ui.js'

export function initLogin() {
  if (getToken()) {
    window.location.replace('tickets.html')
    return
  }

  const form = document.getElementById('login-form')
  const email = document.getElementById('login-email')
  const password = document.getElementById('login-password')
  const hint = document.getElementById('login-hint')

  if (!form || !email || !password) return

  if (hint) {
    hint.textContent = 'Sign in: priya@deskhub.in / demo123'
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    try {
      await login(email.value.trim(), password.value)
      toast('Signed in', 'success')
      window.location.href = 'tickets.html'
    } catch (e) {
      toast(e.message || 'Login failed', 'error')
    }
  })
}
