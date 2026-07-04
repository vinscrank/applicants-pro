package com.interview.billing;

import com.interview.domain.User;
import java.util.Map;

public final class BillingPlans {

    public record PlanDefinition(
            String id,
            String name,
            boolean liveJobs,
            int aiCallsMonth,
            boolean autoDiscover,
            boolean companionAutofill,
            int applicationsMax) {
    }

    private static final PlanDefinition OWNER = new PlanDefinition(
            "owner", "Proprietario", true, 1_000_000, true, true, 1_000_000);

    private static final PlanDefinition FREE = new PlanDefinition(
            "free", "Free", false, 0, false, false, 40);

    private static final PlanDefinition PRO = new PlanDefinition(
            "pro", "Pro", true, 200, false, true, 500);

    private static final PlanDefinition BUSINESS = new PlanDefinition(
            "business", "Business", true, 800, true, true, 5000);

    private static final Map<String, PlanDefinition> PLANS = Map.of(
            "free", FREE,
            "pro", PRO,
            "business", BUSINESS);

    private BillingPlans() {
    }

    public static PlanDefinition ownerPlan() {
        return OWNER;
    }

    public static PlanDefinition getPlan(String planId) {
        return PLANS.getOrDefault(planId, FREE);
    }

    public static boolean isPaidActive(User user) {
        return "active".equals(user.getSubscriptionStatus())
                && ("pro".equals(user.getPlanTier()) || "business".equals(user.getPlanTier()));
    }

    public static String effectivePlanId(User user, boolean isOwner) {
        if (isOwner || "owner".equals(user.getPlanTier())) {
            return "owner";
        }
        if (isPaidActive(user)) {
            return user.getPlanTier();
        }
        if ("trialing".equals(user.getSubscriptionStatus()) && PLANS.containsKey(user.getPlanTier())) {
            return user.getPlanTier();
        }
        return "free";
    }

    public static PlanDefinition planForUser(User user, boolean isOwner) {
        if (isOwner || "owner".equals(user.getPlanTier())) {
            return OWNER;
        }
        return getPlan(effectivePlanId(user, false));
    }
}
