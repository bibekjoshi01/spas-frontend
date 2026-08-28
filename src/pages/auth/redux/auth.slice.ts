import Cookies from "js-cookie"
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { IAuthState } from "./auth.types"
import { hydrateProfile } from "./hydrateprofile"

const initialState: IAuthState = {
  tokens: null,
  isAuthenticated: false,
  isSuperUser: false,
  profile: null,
  sessionStatus: "idle",
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<
        Omit<IAuthState, "sessionStatus"> & { keepSignedIn?: boolean }
      >
    ) => {
      const { tokens, isSuperUser, profile, keepSignedIn } = action.payload
      state.tokens = tokens
      state.isAuthenticated = true
      state.isSuperUser = isSuperUser ?? state.isSuperUser
      if (profile !== undefined) {
        state.profile = profile
      }
      state.sessionStatus = "ready"

      const isSecureContext = window.location.protocol === "https:"

      Cookies.set("access", tokens?.access as string, {
        path: "/",
        secure: isSecureContext,
        sameSite: "Lax",
        expires: 1 / 24, // 60 minutes, matches backend default
      })
      Cookies.set("refresh", tokens?.refresh as string, {
        path: "/",
        secure: isSecureContext,
        sameSite: "Lax",
        // "Keep me signed in" checked -> persists 7 days (matches backend
        // JWT_REFRESH lifetime), even across browser restarts.
        // Unchecked -> plain session cookie, cleared when the browser closes.
        ...(keepSignedIn ? { expires: 10 } : {}),
      })
    },

    logoutSuccess: (state) => {
      Cookies.remove("access", { path: "/" })
      Cookies.remove("refresh", { path: "/" })

      state.tokens = null
      state.isAuthenticated = false
      state.profile = null
      state.isSuperUser = false
      state.sessionStatus = "ready"
    },

    refreshTokenSuccess: (state, action: PayloadAction<{ access: string }>) => {
      const { access } = action.payload
      if (state.tokens) {
        state.tokens.access = access
      }

      Cookies.set("access", access, {
        path: "/",
        secure: window.location.protocol === "https:",
        sameSite: "Lax",
        expires: 1 / 24, // 60 minutes, matches backend default
      })
    },

    setProfile: (state, action: PayloadAction<IAuthState["profile"]>) => {
      state.profile = action.payload
      state.isSuperUser = action.payload?.isSuperuser ?? false
      state.isAuthenticated = Boolean(action.payload)
      state.sessionStatus = "ready"
    },
    sessionCheckStarted: (state) => {
      state.sessionStatus = "checking"
    },
    sessionInvalidated: (state) => {
      state.tokens = null
      state.profile = null
      state.isAuthenticated = false
      state.isSuperUser = false
      state.sessionStatus = "ready"
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateProfile.fulfilled, (state, action) => {
      state.profile = action.payload
    })
  },
})

export const {
  loginSuccess,
  logoutSuccess,
  refreshTokenSuccess,
  setProfile,
  sessionCheckStarted,
  sessionInvalidated,
} = authSlice.actions
export default authSlice.reducer
