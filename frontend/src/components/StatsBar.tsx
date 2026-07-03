import type { Stats } from "../types";
import { DAILY_APPLICATION_GOAL } from "../constants";

interface Props {
  stats: Stats;
}

export default function StatsBar({ stats }: Props) {
  const remainingToday = Math.max(0, DAILY_APPLICATION_GOAL - stats.applied_today);
  const goalReached = remainingToday === 0;
  const progress = Math.min(100, (stats.applied_today / DAILY_APPLICATION_GOAL) * 100);

  return (
    <section className="stats-section">
      <div className="stats-hero card">
        <div className="stats-hero-main">
          <div className="stats-hero-top">
            <div className="stats-hero-label">Obiettivo giornaliero</div>
            <div className="stats-hero-today">
              <span className="stats-hero-today-label">Oggi</span>
              <span className="stats-hero-today-value">{stats.applied_today}</span>
            </div>
          </div>
          <div className="stats-hero-value">
            <span className="stats-hero-number">{stats.applied_today}</span>
            <span className="stats-hero-separator">/</span>
            <span className="stats-hero-goal">{DAILY_APPLICATION_GOAL}</span>
          </div>
          <div className="stats-progress">
            <div className="stats-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="stats-hero-caption">
            {goalReached
              ? "Obiettivo raggiunto per oggi"
              : `Ancora ${remainingToday} candidature per completare la giornata`}
          </p>
        </div>
      </div>
    </section>
  );
}
