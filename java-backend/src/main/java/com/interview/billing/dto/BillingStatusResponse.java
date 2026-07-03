package com.interview.billing.dto;

import java.time.LocalDateTime;

public record BillingStatusResponse(
        String planTier,
        String subscriptionStatus,
        LocalDateTime subscriptionPeriodEnd,
        boolean stripeConfigured) {
}
