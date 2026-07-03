package com.interview.billing;

import com.interview.billing.dto.BillingStatusResponse;
import com.interview.billing.dto.CheckoutSessionResponse;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {

    private final StripeProperties stripeProperties;
    private final UserRepository userRepository;

    public BillingService(StripeProperties stripeProperties, UserRepository userRepository) {
        this.stripeProperties = stripeProperties;
        this.userRepository = userRepository;
    }

    public BillingStatusResponse getStatus(User user) {
        return new BillingStatusResponse(
                user.getPlanTier(),
                user.getSubscriptionStatus(),
                user.getSubscriptionPeriodEnd(),
                stripeProperties.isConfigured());
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
