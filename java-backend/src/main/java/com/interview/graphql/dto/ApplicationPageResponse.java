package com.interview.graphql.dto;

import com.interview.domain.Application;
import java.util.List;

public record ApplicationPageResponse(
        List<Application> items,
        int totalCount,
        int limit,
        int offset,
        boolean hasNextPage) {}
