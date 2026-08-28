export interface IRole {
  id: number
  name: string
  codename: string
}

export interface ITokens {
  refresh: string
  access: string
}

export type SessionStatus = "idle" | "checking" | "ready"

export interface IUserProfile {
  id: number
  uuid: string
  username: string
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNo: string
  alternatePhoneNo: string
  photo: string | null
  isSuperuser: boolean
  roles: IRole[]
  permissions: string[]
}

export interface IAuthState {
  tokens: ITokens | null
  isAuthenticated: boolean
  isSuperUser: boolean
  profile: IUserProfile | null
  sessionStatus: SessionStatus
}
