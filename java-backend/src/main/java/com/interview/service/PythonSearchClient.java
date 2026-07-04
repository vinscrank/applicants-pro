package com.interview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class PythonSearchClient {

    private final RestClient pythonAiRestClient;
    private final ObjectMapper objectMapper;

    public PythonSearchClient(RestClient pythonAiRestClient, ObjectMapper objectMapper) {
        this.pythonAiRestClient = pythonAiRestClient;
        this.objectMapper = objectMapper;
    }

    public JsonNode parseSearch(Integer userId, String promptText, JsonNode command) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("prompt_text", promptText);
        if (command != null && !command.isNull()) {
            body.set("command", command);
        }
        return post(userId, "/api/internal/search/parse", body);
    }

    public JsonNode runSearch(Integer userId, JsonNode command, JsonNode preferences) {
        ObjectNode body = objectMapper.createObjectNode();
        if (command != null && !command.isNull()) {
            body.set("command", command);
        }
        if (preferences != null && !preferences.isNull()) {
            body.set("preferences", preferences);
        }
        return post(userId, "/api/internal/search/run", body);
    }

    public JsonNode llmStats() {
        return pythonAiRestClient.get()
                .uri("/api/internal/llm/stats")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode updateLlmBudget(double monthlyBudgetUsd) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("monthly_budget_usd", monthlyBudgetUsd);
        return pythonAiRestClient.put()
                .uri("/api/internal/llm/budget")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode updateLlmControls(JsonNode controls) {
        return pythonAiRestClient.put()
                .uri("/api/internal/llm/controls")
                .contentType(MediaType.APPLICATION_JSON)
                .body(controls)
                .retrieve()
                .body(JsonNode.class);
    }

    private JsonNode post(Integer userId, String path, ObjectNode body) {
        return pythonAiRestClient.post()
                .uri(path)
                .header("X-User-Id", userId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }
}
