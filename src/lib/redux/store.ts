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
} from "@/pages/auth/redux/auth.slice"

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "common"], // add the slices that we want to persist
}
const persistedReducer = persistReducer(persistConfig, rootReducer)

const accountBoundaryListener = createListenerMiddleware()

accountBoundaryListener.startListening({
  matcher: isAnyOf(loginSuccess, logoutSuccess, sessionInvalidated),
  effect: (action, api) => {
    // RTK Query cache entries are scoped to the account that fetched them.
    // Keeping them through an account switch can expose stale admin rows to a
    // teacher and can make screens request resources the new account cannot
    // access. Reset all server data at every authentication boundary.
    api.dispatch(rootAPI.util.resetApiState())

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
