import JobsView from '@/jobs/JobsView'

export function SearchTab() {
  return (
    <div className="discover-tab-inner discover-tab-search">
      <JobsView embedded />
    </div>
  )
}
