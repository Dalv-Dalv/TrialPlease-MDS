import { useState, useEffect } from 'react'
import { useAuth } from '../../store/authContext'
import type { ProfileResponse } from './types'

const API_BASE = 'http://localhost:8000/api'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: ProfileResponse }
  | { status: 'error'; message: string }

export function useProfile() {
  const { user } = useAuth()
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!user?.token) return
    setState({ status: 'loading' })

    fetch(`${API_BASE}/profile/`, {
      headers: { Authorization: `Token ${user.token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json() as Promise<ProfileResponse>
      })
      .then((data) => setState({ status: 'ok', data }))
      .catch((err: unknown) =>
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load profile',
        })
      )
  }, [user?.token])

  return state
}
