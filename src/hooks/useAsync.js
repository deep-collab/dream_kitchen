import { useEffect, useState } from 'react'

// Runs an async loader whenever deps change; ignores stale results.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    loader()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: undefined, loading: false, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}
