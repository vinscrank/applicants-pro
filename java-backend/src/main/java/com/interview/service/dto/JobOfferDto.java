package com.interview.service.dto;

public record JobOfferDto(
    String id,
    String title,
    String company,
    String location,
    String url) {
}