import { combineReducers } from "@reduxjs/toolkit"

import authReducer from "@/pages/auth/redux/auth.slice"
import commonReducer from "./common.slice"

import { rootAPI } from "./api-slice"

export const rootReducer = combineReducers({
  // Global state
  auth: authReducer,
  common: commonReducer,

  // RTK Query
  [rootAPI.reducerPath]: rootAPI.reducer,
})
