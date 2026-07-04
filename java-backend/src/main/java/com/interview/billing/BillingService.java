package com.interview.billing;

import com.interview.billing.dto.BillingFeaturesResponse;
import com.interview.billing.dto.BillingStatusResponse;
import com.interview.billing.dto.CheckoutSessionResponse;
import com.interview.billing.dto.PlanPublicResponse;
import com.interview.billing.dto.PlansListResponse;
import com.interview.config.BillingProperties;
import com.interview.config.StripeProperties;
import com.interview.domain.User;
import com.interview.repository.UserRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

    private final StripeProperties stripeProperties;
    private final BillingProperties billingProperties;
    private final UserRepository userRepository;

    public BillingService(
            StripeProperties stripeProperties,
            BillingProperties billingProperties,
            UserRepository userRepository) {
        this.stripeProperties = stripeProperties;
        this.billingProperties = billingProperties;
        this.userRepository = userRepository;
    }

    public PlansListResponse listPlans() {
        List<PlanPublicResponse> plans = new ArrayList<>();
        plans.add(toPlanPublic(BillingPlans.getPlan("free")));
        plans.add(toPlanPublic(BillingPlans.getPlan("pro")));
        plans.add(toPlanPublic(BillingPlans.getPlan("business")));
        return new PlansListResponse(plans, stripeProperties.isConfigured());
    }

    private PlanPublicResponse toPlanPublic(BillingPlans.PlanDefinition plan) {
        return new PlanPublicResponse(
                plan.id(),
                plan.name(),
                planPriceEurMonth(plan.id()),
                planPriceEurYear(plan.id()),
                plan.offerteLive(),
                plan.aiCallsMonth(),
                plan.autoDiscover(),
                plan.companionAutofill(),
                plan.applicationsMax(),
                planHighlights(plan));
    }

    private static double planPriceEurMonth(String planId) {
        return switch (planId) {
            case "pro" -> 14.99;
            case "business" -> 29.99;
            default -> 0;
        };
    }

    private static double planPriceEurYear(String planId) {
        return switch (planId) {
            case "pro" -> 149;
            case "business" -> 299;
            default -> 0;
        };
    }

    private static List<String> planHighlights(BillingPlans.PlanDefinition plan) {
        return switch (plan.id()) {
            case "free" -> List.of(
                    "Application tracker",
                    "Up to " + plan.applicationsMax() + " applications",
                    "JSON export");
            case "pro" -> List.of(
                    "Live offers + AI",
                    plan.aiCallsMonth() + " AI analyses/month",
                    "Companion + autofill",
                    "Tracker sync");
            case "business" -> List.of(
                    "Everything in Pro",
                    plan.aiCallsMonth() + " AI analyses/month",
                    "Company auto-discover",
                    "Priority support");
            default -> List.of();
        };
    }

    public BillingStatusResponse getStatus(User user) {
        boolean isOwner = isOwner(user);
        boolean ownerAccess = isOwner || "owner".equals(user.getPlanTier());
        BillingPlans.PlanDefinition plan = BillingPlans.planForUser(user, isOwner);
        return new BillingStatusResponse(
                plan.id(),
                plan.name(),
                user.getPlanTier(),
                ownerAccess,
                user.getSubscriptionStatus(),
                user.getSubscriptionPeriodEnd(),
                stripeProperties.isConfigured(),
                new BillingFeaturesResponse(
                        plan.offerteLive(),
                        plan.aiCallsMonth(),
                        0,
                        plan.autoDiscover(),
                        plan.companionAutofill(),
                        plan.applicationsMax()));
    }

    private boolean isOwner(User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            return false;
        }
        return billingProperties
                .getOwnerEmailSet()
                .contains(user.getEmail().trim().toLowerCase(Locale.ROOT));
    }

    @Transactional
    public CheckoutSessionResponse createCheckoutSession(User user) {
        requireStripeConfigured();

        try {
            String customerId = ensureStripeCustomer(user);

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setCustomer(customerId)
                    .setSuccessUrl(stripeProperties.getSuccessUrl())
                    .setCancelUrl(stripeProperties.getCancelUrl())
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPrice(stripeProperties.getPriceId())
                            .setQuantity(1L)
                            .build())
                    .putMetadata("userId", user.getId().toString())
                    .build();

            Session session = Session.create(params);
            return new CheckoutSessionResponse(session.getUrl());
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Failed to create Stripe checkout session");
        }
    }

    @Transactional
    public void handleWebhook(String payload, String signatureHeader) {
        requireWebhookConfigured();

        Event event;
        try {
            event = Webhook.constructEvent(
                    payload, signatureHeader, stripeProperties.getWebhookSecret());
        } catch (SignatureVerificationException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe signature");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            Session session = (Session) event.getDataObjectDeserializer()
                    .getObject()
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Invalid checkout session payload"));
            activateSubscription(session);
        }
    }

    private void activateSubscription(Session session) {
        String userIdValue = session.getMetadata().get("userId");
        if (userIdValue == null) {
            return;
        }

        User user = userRepository.findById(Integer.valueOf(userIdValue))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setPlanTier("pro");
        user.setSubscriptionStatus("active");
        user.setStripeCustomerId(session.getCustomer());
        user.setStripeSubscriptionId(session.getSubscription());
        user.setSubscriptionPeriodEnd(LocalDateTime.now().plusMonths(1));
        userRepository.save(user);
    }

    private String ensureStripeCustomer(User user) throws Exception {
        if (user.getStripeCustomerId() != null && !user.getStripeCustomerId().isBlank()) {
            return user.getStripeCustomerId();
        }

        Customer customer = Customer.create(CustomerCreateParams.builder()
                .setEmail(user.getEmail())
                .putMetadata("userId", user.getId().toString())
                .build());

        user.setStripeCustomerId(customer.getId());
        userRepository.save(user);
        return customer.getId();
    }

    private void requireStripeConfigured() {
        if (!stripeProperties.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Stripe is not configured");
        }
    }

    private void requireWebhookConfigured() {
        if (stripeProperties.getWebhookSecret() == null
                || stripeProperties.getWebhookSecret().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Stripe webhook is not configured");
        }
    }
}
