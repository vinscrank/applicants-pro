package com.interview.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record RunSearchResponse(
        @JsonProperty("search_id") String searchId,
        List<JobOfferDto> offers) {
}
