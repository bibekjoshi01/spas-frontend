import { createAsyncThunk } from "@reduxjs/toolkit"
import { axiosInstance } from "@/lib/redux/axios"
import type { IUserProfile } from "./auth.types"

export const hydrateProfile = createAsyncThunk(
  "auth/hydrateProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<IUserProfile>(
        "user-mod/account/me"
      )

      return response.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data ?? "Unable to fetch profile.")
    }
  }
)
