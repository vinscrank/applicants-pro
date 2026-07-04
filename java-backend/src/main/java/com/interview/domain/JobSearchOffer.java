package com.interview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "offerte_offers")
public class JobSearchOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "search_id", nullable = false)
    private JobSearchRecord search;

    @Column(name = "offer_id", nullable = false, length = 64)
    private String offerId;

    @Column(nullable = false, length = 255)
    private String company;

    @Column(nullable = false, length = 500)
    private String role;

    @Column(name = "apply_url", nullable = false, length = 1000)
    private String applyUrl;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "posted_at", length = 64)
    private String postedAt;

    @Column(name = "language_requirement", length = 255)
    private String languageRequirement;

    @Column(nullable = false, length = 32)
    private String seniority;

    @Column(name = "web_dev_fit", nullable = false)
    private Integer webDevFit;

    @Column(name = "web_dev_fit_label", nullable = false, length = 255)
    private String webDevFitLabel;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "status_reason", nullable = false, columnDefinition = "TEXT")
    private String statusReason;

    @Column(columnDefinition = "TEXT")
    private String location;

    @Column(nullable = false, length = 16)
    private String origin;

    @Column(name = "verified_at", nullable = false)
    private LocalDateTime verifiedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public JobSearchRecord getSearch() {
        return search;
    }

    public void setSearch(JobSearchRecord search) {
        this.search = search;
    }

    public String getOfferId() {
        return offerId;
    }

    public void setOfferId(String offerId) {
        this.offerId = offerId;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getApplyUrl() {
        return applyUrl;
    }

    public void setApplyUrl(String applyUrl) {
        this.applyUrl = applyUrl;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getPostedAt() {
        return postedAt;
    }

    public void setPostedAt(String postedAt) {
        this.postedAt = postedAt;
    }

    public String getLanguageRequirement() {
        return languageRequirement;
    }

    public void setLanguageRequirement(String languageRequirement) {
        this.languageRequirement = languageRequirement;
    }

    public String getSeniority() {
        return seniority;
    }

    public void setSeniority(String seniority) {
        this.seniority = seniority;
    }

    public Integer getWebDevFit() {
        return webDevFit;
    }

    public void setWebDevFit(Integer webDevFit) {
        this.webDevFit = webDevFit;
    }

    public String getWebDevFitLabel() {
        return webDevFitLabel;
    }

    public void setWebDevFitLabel(String webDevFitLabel) {
        this.webDevFitLabel = webDevFitLabel;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public void setStatusReason(String statusReason) {
        this.statusReason = statusReason;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}
