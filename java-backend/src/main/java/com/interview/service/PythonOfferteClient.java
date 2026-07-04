package com.interview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class PythonOfferteClient {

    private final RestClient pythonAiRestClient;
    private final ObjectMapper objectMapper;

    public PythonOfferteClient(RestClient pythonAiRestClient, ObjectMapper objectMapper) {
        this.pythonAiRestClient = pythonAiRestClient;
        this.objectMapper = objectMapper;
    }

    public JsonNode get(Integer userId, String path) {
        return exchange(userId, HttpMethod.GET, path, null);
    }

    public JsonNode post(Integer userId, String path, JsonNode body) {
        return exchange(userId, HttpMethod.POST, path, body);
    }

    public JsonNode put(Integer userId, String path, JsonNode body) {
        return exchange(userId, HttpMethod.PUT, path, body);
    }

    public JsonNode delete(Integer userId, String path) {
        try {
            String raw = pythonAiRestClient.delete()
                    .uri("/api/internal/offerte" + path)
                    .header("X-User-Id", userId.toString())
                    .retrieve()
                    .body(String.class);
            if (raw == null || raw.isBlank()) {
                return objectMapper.createObjectNode().put("ok", true);
            }
            return objectMapper.readTree(raw);
        } catch (RestClientResponseException ex) {
            throw toStatusException(ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Python AI service unavailable");
        }
    }

    public String getHtml(Integer userId, String path, String queryParam, String queryValue) {
        String uri = UriComponentsBuilder.fromPath("/api/internal/offerte" + path)
                .queryParam(queryParam, queryValue)
                .build()
                .encode()
                .toUriString();
        try {
            return pythonAiRestClient.get()
                    .uri(uri)
                    .header("X-User-Id", userId.toString())
                    .accept(MediaType.TEXT_HTML)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException ex) {
            throw toStatusException(ex);
        }
    }

    private JsonNode exchange(Integer userId, HttpMethod method, String path, JsonNode body) {
        try {
            RestClient.RequestBodySpec spec = pythonAiRestClient.method(method)
                    .uri("/api/internal/offerte" + path)
                    .header("X-User-Id", userId.toString());
            if (body != null && method != HttpMethod.GET) {
                spec.contentType(MediaType.APPLICATION_JSON).body(body);
            }
            return spec.retrieve().body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            throw toStatusException(ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Python AI service unavailable");
        }
    }

    private ResponseStatusException toStatusException(RestClientResponseException ex) {
        String detail = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
        String message = detail;
        try {
            JsonNode node = objectMapper.readTree(detail);
            if (node.hasNonNull("detail")) {
                message = node.get("detail").asText();
            } else if (node.hasNonNull("message")) {
                message = node.get("message").asText();
            }
        } catch (Exception ignored) {
        }
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.BAD_GATEWAY;
        }
        return new ResponseStatusException(status, message);
    }
}
