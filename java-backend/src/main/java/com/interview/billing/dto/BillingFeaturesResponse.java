package com.interview.billing.dto;

public record BillingFeaturesResponse(
        boolean offerteLive,
        int aiCallsMonth,
        int aiCallsUsed,
        boolean autoDiscover,
        boolean companionAutofill,
        int applicationsMax) {
}
