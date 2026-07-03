package com.interview.service;

import com.interview.service.dto.ParseSearchRequest;
import com.interview.service.dto.ParseSearchResponse;
import com.interview.service.dto.RunSearchRequest;
import com.interview.service.dto.RunSearchResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class JobSearchService {

  private final RestClient pythonAiRestClient;

  public JobSearchService(@Qualifier("pythonAiRestClient") RestClient pythonAiRestClient) {
    this.pythonAiRestClient = pythonAiRestClient;
  }

  public ParseSearchResponse parseSearchPrompt(String prompt) {
    return pythonAiRestClient.post()
        .uri("/api/internal/search/parse")
        .body(new ParseSearchRequest(prompt))
        .retrieve()
        .body(ParseSearchResponse.class);
  }

  public RunSearchResponse runJobSearch(RunSearchRequest request) {
    return pythonAiRestClient.post()
        .uri("/api/internal/search/run")
        .body(request)
        .retrieve()
        .body(RunSearchResponse.class);
  }
}