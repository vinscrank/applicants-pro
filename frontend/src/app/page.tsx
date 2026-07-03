"use client"

import AppHeader from "@/components/AppHeader"
import ApplicationsKanban from "@/components/ApplicationsKanban"
import AuthForm from "@/components/AuthForm"
import { useAuth } from "@/context/AuthContext"

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <main className="p-8">Loading...</main>

  return (
    <main className="p-8">
      {!user ? (
        <>
          <h1 className="text-2xl font-bold mb-4">Applications</h1>
          <AuthForm />
        </>
      ) : (
        <>
          <AppHeader />
          <ApplicationsKanban />
        </>
      )}
    </main>
  )
}
