"use client"

import { useQuery } from "@apollo/client/react"
import { GET_APPLICATIONS } from "@/graphql/queries"

const COLUMNS = ["applied", "interview", "offer", "rejected"] as const

export default function ApplicationsKanban() {
  const { data, loading, error } = useQuery(GET_APPLICATIONS)

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  const applications = data?.applications ?? []

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      {COLUMNS.map((status) => (
        <div key={status} className="border rounded p-3 bg-gray-50">
          <h2 className="font-semibold uppercase text-sm mb-3">{status}</h2>
          {applications
            .filter((app) => app.status === status)
            .map((app) => (
              <div key={app.id} className="bg-white border rounded p-2 mb-2">
                <p className="font-medium">{app.companyName}</p>
                <p className="text-sm text-gray-600">{app.jobTitle}</p>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
