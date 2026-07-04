package com.interview.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CheckoutRequest(
        @JsonProperty("plan_id") String planId,
        String interval) {
}
