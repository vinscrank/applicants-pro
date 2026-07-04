package com.interview.billing;

import com.interview.auth.AuthService;
import com.interview.billing.dto.BillingStatusResponse;
import com.interview.billing.dto.CheckoutRequest;
import com.interview.billing.dto.CheckoutSessionResponse;
import com.interview.billing.dto.PlansListResponse;
import com.interview.billing.dto.PortalSessionResponse;
import com.interview.domain.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v2/billing")
public class BillingController {

    private final AuthService authService;
    private final BillingService billingService;

    public BillingController(AuthService authService, BillingService billingService) {
        this.authService = authService;
        this.billingService = billingService;
    }

    @GetMapping("/plans")
    public PlansListResponse plans() {
        return billingService.listPlans();
    }

    @GetMapping("/status")
    public BillingStatusResponse status() {
        return billingService.getStatus(currentUser());
    }

    @PostMapping("/checkout")
    public CheckoutSessionResponse checkout(@RequestBody(required = false) CheckoutRequest request) {
        User user = currentUser();
        if (request == null) {
            return billingService.createCheckoutSession(user);
        }
        return billingService.createCheckoutSession(
                user,
                request.planId() != null ? request.planId() : "pro",
                request.interval() != null ? request.interval() : "month");
    }

    @PostMapping("/portal")
    public PortalSessionResponse portal() {
        return billingService.createPortalSession(currentUser());
    }

    @PostMapping("/webhook")
    public void webhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {
        billingService.handleWebhook(payload, signature);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authService.getUserByEmail(auth.getName());
    }
}
