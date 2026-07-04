package com.interview.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.stripe")
public class StripeProperties {

    private String secretKey = "";
    private String webhookSecret = "";
    private String priceId = "";
    private String pricePro = "";
    private String priceProAnnual = "";
    private String priceBusiness = "";
    private String priceBusinessAnnual = "";
    private String successUrl = "http://localhost:3000/billing/success";
    private String cancelUrl = "http://localhost:3000/billing/cancel";
    private String portalReturnUrl = "http://localhost:3000/#account?tab=billing";

    public boolean isConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }

    public boolean hasCheckoutPrices() {
        return isConfigured()
                && ((pricePro != null && !pricePro.isBlank())
                        || (priceId != null && !priceId.isBlank()));
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public String getPriceId() {
        return priceId;
    }

    public void setPriceId(String priceId) {
        this.priceId = priceId;
    }

    public String getPricePro() {
        return pricePro;
    }

    public void setPricePro(String pricePro) {
        this.pricePro = pricePro;
    }

    public String getPriceProAnnual() {
        return priceProAnnual;
    }

    public void setPriceProAnnual(String priceProAnnual) {
        this.priceProAnnual = priceProAnnual;
    }

    public String getPriceBusiness() {
        return priceBusiness;
    }

    public void setPriceBusiness(String priceBusiness) {
        this.priceBusiness = priceBusiness;
    }

    public String getPriceBusinessAnnual() {
        return priceBusinessAnnual;
    }

    public void setPriceBusinessAnnual(String priceBusinessAnnual) {
        this.priceBusinessAnnual = priceBusinessAnnual;
    }

    public String getPortalReturnUrl() {
        return portalReturnUrl;
    }

    public void setPortalReturnUrl(String portalReturnUrl) {
        this.portalReturnUrl = portalReturnUrl;
    }

    public String getSuccessUrl() {
        return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
        this.successUrl = successUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }

    public void setCancelUrl(String cancelUrl) {
        this.cancelUrl = cancelUrl;
    }
}
