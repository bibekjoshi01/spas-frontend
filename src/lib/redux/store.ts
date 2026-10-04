import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from "@reduxjs/toolkit"
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist"
import storageModule from "redux-persist/lib/storage"

const storage =
  (storageModule as any).default?.default ??
  (storageModule as any).default ??
  storageModule

import { rootReducer } from "./reducers"
import { rootAPI } from "./api-slice"
import { auth } from "./auth"
import {
  loginSuccess,
  logoutSuccess,
  sessionInvalidated,
  setProfile,
} from "@/pages/auth/redux/auth.slice"
import type { IUserProfile } from "@/pages/auth/redux/auth.types"

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "common"], // add the slices that we want to persist
}
const persistedReducer = persistReducer(persistConfig, rootReducer)

const accountBoundaryListener = createListenerMiddleware()

/** Everything about a profile that decides what the server will return. */
const accessFingerprint = (profile: IUserProfile | null | undefined) =>
  profile
    ? JSON.stringify([
        profile.id,
        profile.isSuperuser,
        (profile.roles ?? []).map((role) => role.codename).sort(),
        [...(profile.permissions ?? [])].sort(),
      ])
    : null

accountBoundaryListener.startListening({
  matcher: isAnyOf(loginSuccess, logoutSuccess, sessionInvalidated, setProfile),
  effect: (action, api) => {
    // A fresh profile may reflect revoked permissions or an account switched
    // in another tab, but the session recheck on every window focus and a
    // profile edit also land here. Only a change of identity or access is a
    // boundary; wiping the cache for anything else blanks every open screen.
    if (setProfile.match(action)) {
      const previous = (api.getOriginalState() as RootState).auth.profile
      if (accessFingerprint(previous) === accessFingerprint(action.payload))
        return
    }

    // RTK Query cache entries are scoped to the account that fetched them.
    // Keeping them through an account switch can expose stale admin rows to a
    // teacher and can make screens request resources the new account cannot
    // access. Reset all server data at every authentication boundary.
    api.dispatch(rootAPI.util.resetApiState())

    if (setProfile.match(action)) return
    if (sessionInvalidated.match(action)) auth.clear()

    // Remembered class IDs and password-reset progress are session-specific.
    sessionStorage.clear()
  },
})

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(accountBoundaryListener.middleware)
      .concat(rootAPI.middleware),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
