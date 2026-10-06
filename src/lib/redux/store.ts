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
import { CACHE_TAGS, rootAPI } from "./api-slice"
import { auth } from "./auth"
import type { IAuthState } from "@/pages/auth/redux/auth.types"
import {
  loginSuccess,
  logoutSuccess,
  sessionInvalidated,
  setProfile,
} from "@/pages/auth/redux/auth.slice"

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "common"], // add the slices that we want to persist
}
const persistedReducer = persistReducer(persistConfig, rootReducer)

const accountBoundaryListener = createListenerMiddleware()

accountBoundaryListener.startListening({
  matcher: isAnyOf(loginSuccess, logoutSuccess, sessionInvalidated, setProfile),
  effect: (action, api) => {
    if (setProfile.match(action)) {
      const previous = (api.getOriginalState() as { auth: IAuthState }).auth
        .profile
      const current = action.payload
      const authority = (profile: IAuthState["profile"]) =>
        JSON.stringify({
          id: profile?.id,
          uuid: profile?.uuid,
          isSuperuser: profile?.isSuperuser,
          mustChangePassword: profile?.mustChangePassword,
          permissions: [...(profile?.permissions ?? [])].sort(),
          roles: (profile?.roles ?? []).map((role) => role.codename).sort(),
        })

      if (previous && current && authority(previous) === authority(current)) {
        // Focus checks refresh visible data without clearing pending mutations
        // such as the CSV preview started when a native file picker closes.
        api.dispatch(rootAPI.util.invalidateTags([...CACHE_TAGS]))
        return
      }
    }
    // RTK Query cache entries are scoped to the account that fetched them.
    // Keeping them through an account switch can expose stale admin rows to a
    // teacher and can make screens request resources the new account cannot
    // access. Reset all server data at every authentication boundary.
    api.dispatch(rootAPI.util.resetApiState())

    // Changed authority clears protected data; unchanged authority was
    // revalidated above without resetting pending mutations.
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
