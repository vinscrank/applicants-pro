package com.interview.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PlansListResponse(
        List<PlanPublicResponse> plans,
        @JsonProperty("billing_enabled") boolean billingEnabled) {
}
