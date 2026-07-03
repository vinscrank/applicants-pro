"use client"

import { useMutation } from "@apollo/client/react"
import { useState } from "react"
import {
  PARSE_SEARCH_PROMPT,
  RUN_JOB_SEARCH,
  type JobSearchInput,
} from "@/graphql/mutations"

export default function JobSearchPanel() {
  const [prompt, setPrompt] = useState("")
  const [searchInput, setSearchInput] = useState<JobSearchInput | null>(null)
  const [error, setError] = useState("")

  const [parsePrompt, { loading: parsing }] = useMutation(PARSE_SEARCH_PROMPT)
  const [runSearch, { loading: searching, data: searchData }] =
    useMutation(RUN_JOB_SEARCH)

  async function handleParse(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSearchInput(null)

    try {
      const result = await parsePrompt({ variables: { prompt } })
      const parsed = result.data?.parseSearchPrompt
      if (!parsed) return

      setSearchInput({
        jobTitle: parsed.jobTitle,
        location: parsed.location,
        remote: parsed.remote,
      })
    } catch {
      setError("Failed to parse prompt")
    }
  }

  async function handleSearch() {
    if (!searchInput) return
    setError("")

    try {
      await runSearch({ variables: { input: searchInput } })
    } catch {
      setError("Search failed")
    }
  }

  const offers = searchData?.runJobSearch.offers ?? []

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">Job Search</h2>

      <form
        onSubmit={handleParse}
        className="flex flex-col gap-2 max-w-lg mb-4"
      >
        <textarea
          placeholder="e.g. remote Java engineer in Milano"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border p-2 rounded min-h-[80px]"
          required
        />
        <button
          type="submit"
          disabled={parsing}
          className="bg-black text-white p-2 rounded disabled:opacity-50 w-fit"
        >
          {parsing ? "Parsing..." : "Parse prompt"}
        </button>
      </form>

      {searchInput && (
        <div className="border rounded p-4 mb-4 bg-gray-50 max-w-lg">
          <p className="text-sm text-gray-600 mb-2">Parsed filters:</p>
          <ul className="text-sm space-y-1">
            <li>Title: {searchInput.jobTitle ?? "—"}</li>
            <li>Location: {searchInput.location ?? "—"}</li>
            <li>Remote: {searchInput.remote ? "Yes" : "No"}</li>
          </ul>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="mt-3 bg-black text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {searching ? "Searching..." : "Run search"}
          </button>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {offers.length > 0 && (
        <div className="space-y-2 max-w-lg">
          <h3 className="font-semibold">Results ({offers.length})</h3>
          {offers.map((offer) => (
            <div key={offer.id} className="border rounded p-3 bg-white">
              <p className="font-medium">{offer.title}</p>
              <p className="text-sm text-gray-600">{offer.company}</p>
              {offer.location && (
                <p className="text-sm text-gray-500">{offer.location}</p>
              )}
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline mt-1 inline-block"
              >
                View offer
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
