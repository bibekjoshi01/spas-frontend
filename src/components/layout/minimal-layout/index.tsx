import { Outlet } from "react-router-dom"

export default function MinimalLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Outlet />
    </main>
  )
}
