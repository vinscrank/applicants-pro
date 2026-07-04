package com.interview.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record BillingFeaturesResponse(
        @JsonProperty("live_jobs") boolean liveJobs,
        int aiCallsMonth,
        int aiCallsUsed,
        boolean autoDiscover,
        boolean companionAutofill,
        int applicationsMax) {
}
