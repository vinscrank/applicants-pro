package com.interview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(name = "job_title", nullable = false, length = 255)
    private String jobTitle;

    @Column(name = "job_url", length = 500)
    private String jobUrl;

    @Column(name = "company_website", length = 500)
    private String companyWebsite;

    @Column(name = "company_linkedin_url", length = 500)
    private String companyLinkedinUrl;

    @Column(length = 255)
    private String location;

    @Column(nullable = false, length = 50)
    private String status = "applied";

    @Column(nullable = false, length = 20)
    private String priority = "medium";

    @Column(name = "remote_type", length = 30)
    private String remoteType;

    @Column(name = "application_method", length = 50)
    private String applicationMethod;

    @Column(name = "application_method_other", length = 255)
    private String applicationMethodOther;

    @Column(name = "salary_min")
    private Integer salaryMin;

    @Column(name = "salary_max")
    private Integer salaryMax;

    @Column(name = "salary_currency", length = 3)
    private String salaryCurrency = "EUR";

    @Column(name = "visa_sponsorship")
    private Boolean visaSponsorship;

    @Column(name = "ta_name", length = 255)
    private String taName;

    @Column(name = "ta_email", length = 255)
    private String taEmail;

    @Column(name = "ta_linkedin_url", length = 500)
    private String taLinkedinUrl;

    @Column(name = "ta_phone", length = 50)
    private String taPhone;

    @Column(name = "hiring_manager_name", length = 255)
    private String hiringManagerName;

    @Column(name = "hiring_manager_linkedin_url", length = 500)
    private String hiringManagerLinkedinUrl;

    @Column(name = "linkedin_connection_sent")
    private boolean linkedinConnectionSent;

    @Column(name = "linkedin_message_sent")
    private boolean linkedinMessageSent;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "last_contact_date")
    private LocalDate lastContactDate;

    @Column(name = "response_received_at")
    private LocalDate responseReceivedAt;

    @Column(name = "interview_date")
    private LocalDate interviewDate;

    @Column(name = "created_at", nullable = false)
    private LocalDate createdAt;

    @Column(name = "last_applied_at")
    private LocalDateTime lastAppliedAt;

    @Column(name = "application_source", nullable = false, length = 32)
    private String applicationSource = "manual";

    @Column(name = "linked_offer_id", length = 64)
    private String linkedOfferId;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getJobUrl() {
        return jobUrl;
    }

    public void setJobUrl(String jobUrl) {
        this.jobUrl = jobUrl;
    }

    public String getCompanyWebsite() {
        return companyWebsite;
    }

    public void setCompanyWebsite(String companyWebsite) {
        this.companyWebsite = companyWebsite;
    }

    public String getCompanyLinkedinUrl() {
        return companyLinkedinUrl;
    }

    public void setCompanyLinkedinUrl(String companyLinkedinUrl) {
        this.companyLinkedinUrl = companyLinkedinUrl;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getRemoteType() {
        return remoteType;
    }

    public void setRemoteType(String remoteType) {
        this.remoteType = remoteType;
    }

    public String getApplicationMethod() {
        return applicationMethod;
    }

    public void setApplicationMethod(String applicationMethod) {
        this.applicationMethod = applicationMethod;
    }

    public String getApplicationMethodOther() {
        return applicationMethodOther;
    }

    public void setApplicationMethodOther(String applicationMethodOther) {
        this.applicationMethodOther = applicationMethodOther;
    }

    public Integer getSalaryMin() {
        return salaryMin;
    }

    public void setSalaryMin(Integer salaryMin) {
        this.salaryMin = salaryMin;
    }

    public Integer getSalaryMax() {
        return salaryMax;
    }

    public void setSalaryMax(Integer salaryMax) {
        this.salaryMax = salaryMax;
    }

    public String getSalaryCurrency() {
        return salaryCurrency;
    }

    public void setSalaryCurrency(String salaryCurrency) {
        this.salaryCurrency = salaryCurrency;
    }

    public Boolean getVisaSponsorship() {
        return visaSponsorship;
    }

    public void setVisaSponsorship(Boolean visaSponsorship) {
        this.visaSponsorship = visaSponsorship;
    }

    public String getTaName() {
        return taName;
    }

    public void setTaName(String taName) {
        this.taName = taName;
    }

    public String getTaEmail() {
        return taEmail;
    }

    public void setTaEmail(String taEmail) {
        this.taEmail = taEmail;
    }

    public String getTaLinkedinUrl() {
        return taLinkedinUrl;
    }

    public void setTaLinkedinUrl(String taLinkedinUrl) {
        this.taLinkedinUrl = taLinkedinUrl;
    }

    public String getTaPhone() {
        return taPhone;
    }

    public void setTaPhone(String taPhone) {
        this.taPhone = taPhone;
    }

    public String getHiringManagerName() {
        return hiringManagerName;
    }

    public void setHiringManagerName(String hiringManagerName) {
        this.hiringManagerName = hiringManagerName;
    }

    public String getHiringManagerLinkedinUrl() {
        return hiringManagerLinkedinUrl;
    }

    public void setHiringManagerLinkedinUrl(String hiringManagerLinkedinUrl) {
        this.hiringManagerLinkedinUrl = hiringManagerLinkedinUrl;
    }

    public boolean isLinkedinConnectionSent() {
        return linkedinConnectionSent;
    }

    public void setLinkedinConnectionSent(boolean linkedinConnectionSent) {
        this.linkedinConnectionSent = linkedinConnectionSent;
    }

    public boolean isLinkedinMessageSent() {
        return linkedinMessageSent;
    }

    public void setLinkedinMessageSent(boolean linkedinMessageSent) {
        this.linkedinMessageSent = linkedinMessageSent;
    }

    public LocalDate getFollowUpDate() {
        return followUpDate;
    }

    public void setFollowUpDate(LocalDate followUpDate) {
        this.followUpDate = followUpDate;
    }

    public LocalDate getLastContactDate() {
        return lastContactDate;
    }

    public void setLastContactDate(LocalDate lastContactDate) {
        this.lastContactDate = lastContactDate;
    }

    public LocalDate getResponseReceivedAt() {
        return responseReceivedAt;
    }

    public void setResponseReceivedAt(LocalDate responseReceivedAt) {
        this.responseReceivedAt = responseReceivedAt;
    }

    public LocalDate getInterviewDate() {
        return interviewDate;
    }

    public void setInterviewDate(LocalDate interviewDate) {
        this.interviewDate = interviewDate;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastAppliedAt() {
        return lastAppliedAt;
    }

    public void setLastAppliedAt(LocalDateTime lastAppliedAt) {
        this.lastAppliedAt = lastAppliedAt;
    }

    public String getApplicationSource() {
        return applicationSource;
    }

    public void setApplicationSource(String applicationSource) {
        this.applicationSource = applicationSource;
    }

    public String getLinkedOfferId() {
        return linkedOfferId;
    }

    public void setLinkedOfferId(String linkedOfferId) {
        this.linkedOfferId = linkedOfferId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}