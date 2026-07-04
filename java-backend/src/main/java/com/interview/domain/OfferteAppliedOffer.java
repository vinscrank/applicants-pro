package com.interview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "offerte_applied_offers")
@IdClass(OfferteAppliedOfferId.class)
public class OfferteAppliedOffer {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Id
    @Column(name = "offer_id", length = 64)
    private String offerId;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

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

    public LocalDateTime getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(LocalDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }
}
