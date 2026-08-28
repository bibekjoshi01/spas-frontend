import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { CommonState } from "./types"

const initialState: CommonState = {
  sidebarOpen: true,
  dialog: {
    open: false,
    type: null,
    data: null,
  },
}

export const commonSlice = createSlice({
  name: "common",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },

    setSidebar(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },

    openDialog(
      state,
      action: PayloadAction<{
        type: string
        data?: unknown
      }>
    ) {
      state.dialog = {
        open: true,
        type: action.payload.type,
        data: action.payload.data ?? null,
      }
    },

    closeDialog(state) {
      state.dialog = {
        open: false,
        type: null,
        data: null,
      }
    },
  },
})

export const { toggleSidebar, setSidebar, openDialog, closeDialog } =
  commonSlice.actions

export default commonSlice.reducer
