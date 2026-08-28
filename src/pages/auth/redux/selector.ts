import { type RootState } from "@/lib/redux/store"

export const authState = (state: RootState) => {
  return state?.auth
}
