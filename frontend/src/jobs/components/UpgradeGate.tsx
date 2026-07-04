import { useTranslation } from 'react-i18next'
import { navigate } from '../../router'

export function UpgradeGate() {
  const { t } = useTranslation()

  return (
    <div className="jobs-setup-gate card jobs-upgrade-gate">
      <h3>{t('jobs.upgradeTitle')}</h3>
      <p>{t('jobs.upgradeDescription')}</p>
      <div className="jobs-upgrade-actions">
        <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate({ page: 'account', accountTab: 'billing' })}>
          {t('jobs.upgradePro')}
        </button>
        <button type="button" className="jobs-settings-btn" onClick={() => navigate({ page: 'pricing' })}>
          {t('jobs.comparePlans')}
        </button>
      </div>
    </div>
  )
}
