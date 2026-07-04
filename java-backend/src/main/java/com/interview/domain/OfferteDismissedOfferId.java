package com.interview.domain;

import java.io.Serializable;
import java.util.Objects;

public class OfferteDismissedOfferId implements Serializable {

    private Integer userId;
    private String offerId;

    public OfferteDismissedOfferId() {
    }

    public OfferteDismissedOfferId(Integer userId, String offerId) {
        this.userId = userId;
        this.offerId = offerId;
    }

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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof OfferteDismissedOfferId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && Objects.equals(offerId, that.offerId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, offerId);
    }
}
