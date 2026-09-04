import Cookies from "js-cookie"

export const auth = {
  getAccess() {
    return Cookies.get("access")
  },

  getRefresh() {
    return Cookies.get("refresh")
  },

  setAccess(token: string) {
    Cookies.set("access", token, {
      secure: window.location.protocol === "https:",
      sameSite: "Lax",
      path: "/",
      expires: 1 / 24, // 60 minutes, matches the backend default
    })
  },

  setTokens(tokens: { access: string; refresh: string }) {
    this.setAccess(tokens.access)
    Cookies.set("refresh", tokens.refresh, {
      secure: window.location.protocol === "https:",
      sameSite: "Lax",
      path: "/",
      expires: 10,
    })
  },

  clear() {
    Cookies.remove("access", { path: "/" })
    Cookies.remove("refresh", { path: "/" })
  },
}
