package com.interview.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PortalSessionResponse(@JsonProperty("portal_url") String portalUrl) {
}
