"use client"

import { useEffect, useState } from "react"
import DevLogin from "@/components/DevLogin"
import ApplicationsKanban from "@/components/ApplicationsKanban"

export default function Home() {
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(!!localStorage.getItem("accessToken"))
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Applications</h1>
      {!hasToken ? <DevLogin /> : <ApplicationsKanban />}
    </main>
  )
}
