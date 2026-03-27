import { User } from '../types'
import api from './client'

export interface LoginResult {
  access_token: string
  token_type: string
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await api.get<User>('/auth/me')
  return res.data
}

export async function register(email: string, password: string, name: string): Promise<void> {
  await api.post('/auth/register', { email, password, name })
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)
  const res = await api.post<LoginResult>('/auth/login', params)
  return res.data
}
