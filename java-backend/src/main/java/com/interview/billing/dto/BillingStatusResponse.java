package com.interview.billing.dto;

import java.time.LocalDateTime;

public record BillingStatusResponse(
        String planId,
        String planName,
        String planTier,
        boolean isOwner,
        String subscriptionStatus,
        LocalDateTime subscriptionPeriodEnd,
        boolean stripeConfigured,
        BillingFeaturesResponse features) {
}
