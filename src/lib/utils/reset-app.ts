import { persistor } from "../redux/store"

export async function resetApplication() {
  try {
    await persistor.purge()
  } catch (error) {
    console.error("Failed to purge Redux Persist:", error)
  }

  localStorage.clear()
  sessionStorage.clear()

  window.location.replace("/")
}
