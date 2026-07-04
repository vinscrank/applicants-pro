package com.interview.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PlanPublicResponse(
        String id,
        String name,
        @JsonProperty("price_eur_month") double priceEurMonth,
        @JsonProperty("price_eur_year") double priceEurYear,
        @JsonProperty("live_jobs") boolean liveJobs,
        @JsonProperty("ai_calls_month") int aiCallsMonth,
        @JsonProperty("auto_discover") boolean autoDiscover,
        @JsonProperty("companion_autofill") boolean companionAutofill,
        @JsonProperty("applications_max") int applicationsMax,
        List<String> highlights) {
}
