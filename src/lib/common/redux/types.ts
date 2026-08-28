export interface CommonState {
  sidebarOpen: boolean
  dialog: {
    open: boolean
    type: string | null
    data: unknown
  }
}
