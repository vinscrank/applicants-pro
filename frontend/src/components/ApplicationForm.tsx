import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ApplicationFormData } from "../types";
import {
  STATUS_OPTIONS,
  PRIORITY_LABELS,
  REMOTE_LABELS,
  APPLICATION_SOURCE_OPTIONS,
} from "../constants";
import CompanyCombobox from "./CompanyCombobox";

interface Props {
  data: ApplicationFormData;
  onChange: (data: ApplicationFormData) => void;
  companyNames: string[];
  isNew?: boolean;
}

function hasAdvancedData(data: ApplicationFormData): boolean {
  return Boolean(
    data.location?.trim()
    || (data.remote_type && data.remote_type !== "unknown")
    || (data.priority && data.priority !== "medium")
    || data.visa_sponsorship != null
    || data.follow_up_date
    || data.last_contact_date
    || data.response_received_at
    || data.interview_date
    || data.ta_name?.trim()
    || data.ta_email?.trim()
    || data.ta_phone?.trim()
    || data.ta_linkedin_url?.trim()
    || data.hiring_manager_name?.trim()
    || data.hiring_manager_linkedin_url?.trim()
    || data.linkedin_connection_sent
    || data.linkedin_message_sent
    || data.company_website?.trim()
    || data.company_linkedin_url?.trim()
    || data.salary_min != null
    || data.salary_max != null,
  );
}

export default function ApplicationForm({ data, onChange, companyNames, isNew = false }: Props) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(() => !isNew && hasAdvancedData(data));

  const set = <K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const fromLiveJobs = data.application_source === "live_jobs";

  const statusHint = useMemo(() => {
    if (
      data.status === "phone_screen"
      || data.status === "technical_interview"
      || data.status === "final_interview"
    ) {
      return "Imposta la data colloquio nei dettagli avanzati.";
    }
    return null;
  }, [data.status]);

  return (
    <>
      {isNew && (
        <p className="form-intro">
          {t('candidature.formIntroNew')}
        </p>
      )}

      {fromLiveJobs && !isNew && (
        <p className="form-intro form-intro-live">{t('candidature.formIntroLiveJobs')}</p>
      )}

      <div className="form-section form-section-essential">
        <div className="form-grid form-grid-essential">
          <div className="form-field">
            <label>Azienda *</label>
            <CompanyCombobox
              value={data.company_name}
              options={companyNames}
              onChange={(company_name) => set("company_name", company_name)}
              placeholder="Es. Stripe, Google..."
              required
            />
          </div>
          <div className="form-field">
            <label>Ruolo *</label>
            <input
              value={data.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder="Es. Flutter Developer"
              required
            />
          </div>
          <div className="form-field">
            <label>Stato</label>
            <select
              value={data.status}
              onChange={(e) => set("status", e.target.value as ApplicationFormData["status"])}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {statusHint ? <span className="form-field-hint">{statusHint}</span> : null}
          </div>
          <div className="form-field form-field-method">
            <label>Canale</label>
            <div className="method-field-row">
              <select
                value={data.application_method || "company_website"}
                onChange={(e) => {
                  const value = e.target.value as ApplicationFormData["application_method"];
                  onChange({
                    ...data,
                    application_method: value,
                    application_method_other: value === "other" ? data.application_method_other : "",
                  });
                }}
              >
                {APPLICATION_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {data.application_method === "other" && (
                <input
                  value={data.application_method_other || ""}
                  onChange={(e) => set("application_method_other", e.target.value)}
                  placeholder="Specifica..."
                />
              )}
            </div>
          </div>
          <div className="form-field form-field-wide">
            <label>URL annuncio</label>
            <input
              value={data.job_url || ""}
              onChange={(e) => set("job_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          {!isNew && (
            <div className="form-field">
              <label>Prossimo follow-up</label>
              <input
                type="date"
                value={data.follow_up_date || ""}
                onChange={(e) => set("follow_up_date", e.target.value)}
              />
            </div>
          )}
          <div className="form-field form-field-wide">
            <label>Note</label>
            <textarea
              value={data.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Prossimi passi, contatti, dettagli colloquio..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {!isNew && (
        <div className="form-advanced-wrap">
          <button
            type="button"
            className="form-advanced-toggle"
            onClick={() => setShowAdvanced((open) => !open)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Nascondi dettagli avanzati" : "Dettagli avanzati (opzionale)"}
            <span aria-hidden="true">{showAdvanced ? "▾" : "▸"}</span>
          </button>

          {showAdvanced && (
            <div className="form-advanced-panel">
              <div className="form-section">
                <h3>Posizione</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Località</label>
                    <input
                      value={data.location || ""}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="Città, paese"
                    />
                  </div>
                  <div className="form-field">
                    <label>Modalità lavoro</label>
                    <select
                      value={data.remote_type || "unknown"}
                      onChange={(e) => set("remote_type", e.target.value as ApplicationFormData["remote_type"])}
                    >
                      {Object.entries(REMOTE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Priorità</label>
                    <select
                      value={data.priority}
                      onChange={(e) => set("priority", e.target.value as ApplicationFormData["priority"])}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Sponsorizzazione visto</label>
                    <select
                      value={
                        data.visa_sponsorship === null
                          ? ""
                          : data.visa_sponsorship
                            ? "yes"
                            : "no"
                      }
                      onChange={(e) =>
                        set(
                          "visa_sponsorship",
                          e.target.value === "" ? null : e.target.value === "yes",
                        )
                      }
                    >
                      <option value="">Non specificato</option>
                      <option value="yes">Sì</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Date</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Data creazione</label>
                    <input
                      type="date"
                      value={data.created_at}
                      onChange={(e) => set("created_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Ultima candidatura</label>
                    <input
                      type="date"
                      value={data.last_applied_at || ""}
                      onChange={(e) => set("last_applied_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Ultimo contatto</label>
                    <input
                      type="date"
                      value={data.last_contact_date || ""}
                      onChange={(e) => set("last_contact_date", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Risposta ricevuta</label>
                    <input
                      type="date"
                      value={data.response_received_at || ""}
                      onChange={(e) => set("response_received_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Data colloquio</label>
                    <input
                      type="date"
                      value={data.interview_date || ""}
                      onChange={(e) => set("interview_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Contatti</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Talent Acquisition</label>
                    <input
                      value={data.ta_name || ""}
                      onChange={(e) => set("ta_name", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email TA</label>
                    <input
                      type="email"
                      value={data.ta_email || ""}
                      onChange={(e) => set("ta_email", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Telefono TA</label>
                    <input
                      value={data.ta_phone || ""}
                      onChange={(e) => set("ta_phone", e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-wide">
                    <label>LinkedIn TA</label>
                    <input
                      value={data.ta_linkedin_url || ""}
                      onChange={(e) => set("ta_linkedin_url", e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="form-field">
                    <label>Hiring Manager</label>
                    <input
                      value={data.hiring_manager_name || ""}
                      onChange={(e) => set("hiring_manager_name", e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-wide">
                    <label>LinkedIn Hiring Manager</label>
                    <input
                      value={data.hiring_manager_linkedin_url || ""}
                      onChange={(e) => set("hiring_manager_linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="form-field checkbox-field">
                    <input
                      type="checkbox"
                      id="conn-sent"
                      checked={data.linkedin_connection_sent}
                      onChange={(e) => set("linkedin_connection_sent", e.target.checked)}
                    />
                    <label htmlFor="conn-sent">Connessione LinkedIn inviata</label>
                  </div>
                  <div className="form-field checkbox-field">
                    <input
                      type="checkbox"
                      id="msg-sent"
                      checked={data.linkedin_message_sent}
                      onChange={(e) => set("linkedin_message_sent", e.target.checked)}
                    />
                    <label htmlFor="msg-sent">Messaggio LinkedIn inviato</label>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Link e retribuzione</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Sito azienda</label>
                    <input
                      value={data.company_website || ""}
                      onChange={(e) => set("company_website", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>LinkedIn azienda</label>
                    <input
                      value={data.company_linkedin_url || ""}
                      onChange={(e) => set("company_linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Stipendio min (EUR)</label>
                    <input
                      type="number"
                      value={data.salary_min ?? ""}
                      onChange={(e) =>
                        set("salary_min", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Stipendio max (EUR)</label>
                    <input
                      type="number"
                      value={data.salary_max ?? ""}
                      onChange={(e) =>
                        set("salary_max", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
