import { useCallback, useEffect, useState } from "react"

import { useAppSelector } from "@/lib/redux/hooks"

/** Which filters the reader has deliberately shown or hidden, by filter id. */
type Preferences = Record<string, boolean>

const PREFIX = "spas:filters"

function read(key: string): Preferences {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "boolean"
      )
    ) as Preferences
  } catch {
    // Unreadable or corrupt storage just means the screen opens on its defaults.
    return {}
  }
}

function write(key: string, preferences: Preferences) {
  try {
    if (Object.keys(preferences).length === 0) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify(preferences))
  } catch {
    // A browser refusing storage still gets a working toolbar for this visit.
  }
}

/**
 * Remembers which filters a reader keeps on a screen's toolbar.
 *
 * This is view chrome, not tenant data: it is per person and per device, it
 * changes nothing the server would answer differently, and losing it costs a
 * reader two clicks. So it lives in `localStorage` rather than behind an API.
 *
 * The signed-in account is part of the key because a shared office machine is
 * normal here, and one reader's toolbar should not greet the next one.
 */
export function useFilterVisibility(pageKey: string) {
  const accountId = useAppSelector((state) => state.auth.profile?.id)
  const storageKey = `${PREFIX}:${accountId ?? "anon"}:${pageKey}`

  const [state, setState] = useState(() => ({
    key: storageKey,
    preferences: read(storageKey),
  }))

  // The profile hydrates after the first render and can change on a sign-in, so
  // re-read rather than carry the previous key's layout across.
  if (state.key !== storageKey) {
    setState({ key: storageKey, preferences: read(storageKey) })
  }
  const preferences =
    state.key === storageKey ? state.preferences : read(storageKey)

  useEffect(() => {
    write(storageKey, preferences)
  }, [storageKey, preferences])

  const preference = useCallback((id: string) => preferences[id], [preferences])

  const setPreference = useCallback((id: string, visible: boolean) => {
    setState((current) => ({
      key: current.key,
      preferences: { ...current.preferences, [id]: visible },
    }))
  }, [])

  const clearPreferences = useCallback(() => {
    setState((current) => ({ key: current.key, preferences: {} }))
  }, [])

  return {
    preference,
    setPreference,
    clearPreferences,
    hasPreferences: Object.keys(preferences).length > 0,
  }
}
