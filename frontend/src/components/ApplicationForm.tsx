import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import type { ApplicationFormData } from "../types";
import {
  getStatusOptions,
  getApplicationSourceOptions,
  PRIORITY_LABELS,
  REMOTE_LABELS,
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
  const { t, i18n } = useTranslation();
  const formId = useId();
  const [showAdvanced, setShowAdvanced] = useState(() => !isNew && hasAdvancedData(data));
  const statusOptions = useMemo(() => getStatusOptions(), [i18n.language]);
  const sourceOptions = useMemo(() => getApplicationSourceOptions(), [i18n.language]);

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
      return t("candidature.form.statusInterviewHint");
    }
    return null;
  }, [data.status, t]);

  const fieldId = (name: string) => `${formId}-${name}`;

  return (
    <>
      {isNew && (
        <p className="form-intro">
          {t("candidature.formIntroNew")}
        </p>
      )}

      {fromLiveJobs && !isNew && (
        <p className="form-intro form-intro-live">{t("candidature.formIntroLiveJobs")}</p>
      )}

      <div className="form-section form-section-essential">
        <div className="form-grid form-grid-essential">
          <div className="form-field">
            <label htmlFor={fieldId("company")}>
              {t("candidature.quickAdd.company")}
              <span className="form-required" aria-hidden="true"> *</span>
            </label>
            <CompanyCombobox
              id={fieldId("company")}
              value={data.company_name}
              options={companyNames}
              onChange={(company_name) => set("company_name", company_name)}
              placeholder={t("candidature.form.companyPlaceholder")}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor={fieldId("role")}>
              {t("candidature.quickAdd.role")}
              <span className="form-required" aria-hidden="true"> *</span>
            </label>
            <input
              id={fieldId("role")}
              value={data.job_title}
              onChange={(e) => set("job_title", e.target.value)}
              placeholder={t("candidature.form.rolePlaceholder")}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor={fieldId("status")}>{t("candidature.quickAdd.status")}</label>
            <select
              id={fieldId("status")}
              className="form-select"
              value={data.status}
              onChange={(e) => set("status", e.target.value as ApplicationFormData["status"])}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {statusHint ? <span className="form-field-hint">{statusHint}</span> : null}
          </div>
          <div className="form-field form-field-method">
            <label htmlFor={fieldId("channel")}>{t("candidature.form.channel")}</label>
            <div className="method-field-row">
              <select
                id={fieldId("channel")}
                className="form-select"
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
                {sourceOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {data.application_method === "other" && (
                <input
                  id={fieldId("channel-other")}
                  value={data.application_method_other || ""}
                  onChange={(e) => set("application_method_other", e.target.value)}
                  placeholder={t("candidature.form.channelOtherPlaceholder")}
                  aria-label={t("candidature.form.channelOtherPlaceholder")}
                />
              )}
            </div>
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor={fieldId("job-url")}>{t("candidature.quickAdd.jobLink")}</label>
            <input
              id={fieldId("job-url")}
              type="url"
              value={data.job_url || ""}
              onChange={(e) => set("job_url", e.target.value)}
              placeholder={t("candidature.form.urlPlaceholder")}
            />
          </div>
          {!isNew && (
            <div className="form-field">
              <label htmlFor={fieldId("follow-up")}>{t("candidature.form.followUp")}</label>
              <input
                id={fieldId("follow-up")}
                type="date"
                value={data.follow_up_date || ""}
                onChange={(e) => set("follow_up_date", e.target.value)}
              />
            </div>
          )}
          <div className="form-field form-field-wide">
            <label htmlFor={fieldId("notes")}>{t("candidature.form.notes")}</label>
            <textarea
              id={fieldId("notes")}
              value={data.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("candidature.form.notesPlaceholder")}
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
            <span>
              {showAdvanced ? t("candidature.form.advancedHide") : t("candidature.form.advancedShow")}
            </span>
            <ChevronDown
              className={`form-advanced-chevron${showAdvanced ? " open" : ""}`}
              aria-hidden="true"
              size={16}
              strokeWidth={2}
            />
          </button>

          {showAdvanced && (
            <div className="form-advanced-panel">
              <div className="form-section">
                <h3>{t("candidature.form.sectionPosition")}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={fieldId("location")}>{t("candidature.form.location")}</label>
                    <input
                      id={fieldId("location")}
                      value={data.location || ""}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder={t("candidature.form.locationPlaceholder")}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("remote")}>{t("candidature.form.workMode")}</label>
                    <select
                      id={fieldId("remote")}
                      className="form-select"
                      value={data.remote_type || "unknown"}
                      onChange={(e) => set("remote_type", e.target.value as ApplicationFormData["remote_type"])}
                    >
                      {Object.entries(REMOTE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("priority")}>{t("candidature.quickAdd.priority")}</label>
                    <select
                      id={fieldId("priority")}
                      className="form-select"
                      value={data.priority}
                      onChange={(e) => set("priority", e.target.value as ApplicationFormData["priority"])}
                    >
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("visa")}>{t("candidature.form.visaSponsorship")}</label>
                    <select
                      id={fieldId("visa")}
                      className="form-select"
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
                      <option value="">{t("common.notSpecified")}</option>
                      <option value="yes">{t("common.yes")}</option>
                      <option value="no">{t("common.no")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>{t("candidature.form.sectionDates")}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={fieldId("created")}>{t("candidature.form.createdAt")}</label>
                    <input
                      id={fieldId("created")}
                      type="date"
                      value={data.created_at}
                      onChange={(e) => set("created_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("last-applied")}>{t("candidature.form.lastAppliedAt")}</label>
                    <input
                      id={fieldId("last-applied")}
                      type="date"
                      value={data.last_applied_at || ""}
                      onChange={(e) => set("last_applied_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("last-contact")}>{t("candidature.form.lastContact")}</label>
                    <input
                      id={fieldId("last-contact")}
                      type="date"
                      value={data.last_contact_date || ""}
                      onChange={(e) => set("last_contact_date", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("response")}>{t("candidature.form.responseReceived")}</label>
                    <input
                      id={fieldId("response")}
                      type="date"
                      value={data.response_received_at || ""}
                      onChange={(e) => set("response_received_at", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("interview")}>{t("candidature.form.interviewDate")}</label>
                    <input
                      id={fieldId("interview")}
                      type="date"
                      value={data.interview_date || ""}
                      onChange={(e) => set("interview_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>{t("candidature.form.sectionContacts")}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={fieldId("ta-name")}>{t("candidature.form.taName")}</label>
                    <input
                      id={fieldId("ta-name")}
                      value={data.ta_name || ""}
                      onChange={(e) => set("ta_name", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("ta-email")}>{t("candidature.form.taEmail")}</label>
                    <input
                      id={fieldId("ta-email")}
                      type="email"
                      value={data.ta_email || ""}
                      onChange={(e) => set("ta_email", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("ta-phone")}>{t("candidature.form.taPhone")}</label>
                    <input
                      id={fieldId("ta-phone")}
                      value={data.ta_phone || ""}
                      onChange={(e) => set("ta_phone", e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor={fieldId("ta-linkedin")}>{t("candidature.form.taLinkedIn")}</label>
                    <input
                      id={fieldId("ta-linkedin")}
                      value={data.ta_linkedin_url || ""}
                      onChange={(e) => set("ta_linkedin_url", e.target.value)}
                      placeholder={t("candidature.form.linkedinPlaceholder")}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("hm-name")}>{t("candidature.form.hiringManager")}</label>
                    <input
                      id={fieldId("hm-name")}
                      value={data.hiring_manager_name || ""}
                      onChange={(e) => set("hiring_manager_name", e.target.value)}
                    />
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor={fieldId("hm-linkedin")}>{t("candidature.form.hiringManagerLinkedIn")}</label>
                    <input
                      id={fieldId("hm-linkedin")}
                      value={data.hiring_manager_linkedin_url || ""}
                      onChange={(e) => set("hiring_manager_linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="form-field checkbox-field">
                    <input
                      type="checkbox"
                      id={fieldId("conn-sent")}
                      checked={data.linkedin_connection_sent}
                      onChange={(e) => set("linkedin_connection_sent", e.target.checked)}
                    />
                    <label htmlFor={fieldId("conn-sent")}>{t("candidature.form.linkedinConnectionSent")}</label>
                  </div>
                  <div className="form-field checkbox-field">
                    <input
                      type="checkbox"
                      id={fieldId("msg-sent")}
                      checked={data.linkedin_message_sent}
                      onChange={(e) => set("linkedin_message_sent", e.target.checked)}
                    />
                    <label htmlFor={fieldId("msg-sent")}>{t("candidature.form.linkedinMessageSent")}</label>
                  </div>
                </div>
              </div>

              <div className="form-section form-section-last">
                <h3>{t("candidature.form.sectionLinksCompensation")}</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={fieldId("company-website")}>{t("candidature.form.companyWebsite")}</label>
                    <input
                      id={fieldId("company-website")}
                      value={data.company_website || ""}
                      onChange={(e) => set("company_website", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("company-linkedin")}>{t("candidature.form.companyLinkedIn")}</label>
                    <input
                      id={fieldId("company-linkedin")}
                      value={data.company_linkedin_url || ""}
                      onChange={(e) => set("company_linkedin_url", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("salary-min")}>{t("candidature.form.salaryMin")}</label>
                    <input
                      id={fieldId("salary-min")}
                      type="number"
                      value={data.salary_min ?? ""}
                      onChange={(e) =>
                        set("salary_min", e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={fieldId("salary-max")}>{t("candidature.form.salaryMax")}</label>
                    <input
                      id={fieldId("salary-max")}
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
