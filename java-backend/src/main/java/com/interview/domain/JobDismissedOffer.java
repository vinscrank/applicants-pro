package com.interview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_dismissed_offers")
@IdClass(JobDismissedOfferId.class)
public class JobDismissedOffer {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Id
    @Column(name = "offer_id", length = 64)
    private String offerId;

    @Column(name = "dismissed_at", nullable = false)
    private LocalDateTime dismissedAt;

    @Column(name = "apply_url_norm", length = 1000)
    private String applyUrlNorm;

    @Column(name = "company_norm", length = 255)
    private String companyNorm;

    @Column(name = "role_norm", length = 500)
    private String roleNorm;

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getOfferId() {
        return offerId;
    }

    public void setOfferId(String offerId) {
        this.offerId = offerId;
    }

    public LocalDateTime getDismissedAt() {
        return dismissedAt;
    }

    public void setDismissedAt(LocalDateTime dismissedAt) {
        this.dismissedAt = dismissedAt;
    }

    public String getApplyUrlNorm() {
        return applyUrlNorm;
    }

    public void setApplyUrlNorm(String applyUrlNorm) {
        this.applyUrlNorm = applyUrlNorm;
    }

    public String getCompanyNorm() {
        return companyNorm;
    }

    public void setCompanyNorm(String companyNorm) {
        this.companyNorm = companyNorm;
    }

    public String getRoleNorm() {
        return roleNorm;
    }

    public void setRoleNorm(String roleNorm) {
        this.roleNorm = roleNorm;
    }
}
