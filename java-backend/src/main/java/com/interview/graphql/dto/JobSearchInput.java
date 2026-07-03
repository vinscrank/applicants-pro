package com.interview.graphql.dto;

public record JobSearchInput(
        String jobTitle,
        String location,
        Boolean remote) {
}
