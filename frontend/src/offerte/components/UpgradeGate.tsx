import { useTranslation } from 'react-i18next'
import { navigate } from '../../router'

export function UpgradeGate() {
  const { t } = useTranslation()

  return (
    <div className="offerte-setup-gate card offerte-upgrade-gate">
      <h3>{t('offerte.upgradeTitle')}</h3>
      <p>{t('offerte.upgradeDescription')}</p>
      <div className="offerte-upgrade-actions">
        <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate({ page: 'account', accountTab: 'billing' })}>
          {t('offerte.upgradePro')}
        </button>
        <button type="button" className="offerte-settings-btn" onClick={() => navigate({ page: 'pricing' })}>
          {t('offerte.comparePlans')}
        </button>
      </div>
    </div>
  )
}
