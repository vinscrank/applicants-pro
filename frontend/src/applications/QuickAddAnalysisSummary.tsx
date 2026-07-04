import { useTranslation } from 'react-i18next'
import type { JobUrlAnalysis } from '@/annuncio/types'
import { remoteLabel } from '@/i18n/labels'
import { ProfileFitBadge } from '@/offerte/components/ProfileFitBadge'
import { mapAnalysisRemoteType } from './jobUrlAnalysis'
import './quick-add-dialog.css'

interface Props {
  analysis: JobUrlAnalysis
  duplicateHint?: boolean
}

export function QuickAddAnalysisSummary({ analysis, duplicateHint }: Props) {
  const { t } = useTranslation()
  const remoteKey = mapAnalysisRemoteType(analysis.remote_type)
  const hasHighlights = analysis.highlights.length > 0
  const hasConcerns = analysis.concerns.length > 0

  return (
    <div className="quick-add-analysis">
      <div className="quick-add-analysis-head">
        <div>
          <span className="quick-add-analysis-origin">{analysis.origin_label}</span>
          <h3 className="quick-add-analysis-company">{analysis.company || t('candidature.quickAdd.companyUnknown')}</h3>
          <p className="quick-add-analysis-role">{analysis.role || t('candidature.quickAdd.roleUnknown')}</p>
        </div>
        <ProfileFitBadge
          score={analysis.profile_fit_score}
          label={analysis.profile_fit_label}
          available={analysis.profile_fit_available}
        />
      </div>

      <div className="quick-add-analysis-meta">
        <span>{analysis.location || t('candidature.quickAdd.locationUnknown')}</span>
        <span>{remoteLabel(remoteKey)}</span>
      </div>

      {duplicateHint && analysis.tracker_match && (
        <p className="quick-add-analysis-duplicate">
          {t('candidature.quickAdd.duplicateInTracker', {
            role: analysis.tracker_match.job_title,
            company: analysis.tracker_match.company_name,
          })}
        </p>
      )}

      {analysis.summary && (
        <div className="quick-add-analysis-block">
          <span className="quick-add-analysis-label">{t('candidature.quickAdd.summary')}</span>
          <p>{analysis.summary}</p>
        </div>
      )}

      {analysis.review && (
        <div className="quick-add-analysis-block">
          <span className="quick-add-analysis-label">{t('candidature.quickAdd.aiReview')}</span>
          <p>{analysis.review}</p>
        </div>
      )}

      {(hasHighlights || hasConcerns) && (
        <div className="quick-add-analysis-insights">
          {hasHighlights && (
            <div>
              <span className="quick-add-analysis-label">{t('candidature.quickAdd.highlights')}</span>
              <ul>
                {analysis.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {hasConcerns && (
            <div>
              <span className="quick-add-analysis-label">{t('candidature.quickAdd.concerns')}</span>
              <ul className="quick-add-analysis-warn">
                {analysis.concerns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
