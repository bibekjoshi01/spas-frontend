import { configureStore } from "@reduxjs/toolkit"
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

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "common"], // add the slices that we want to persist
}
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(rootAPI.middleware),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
