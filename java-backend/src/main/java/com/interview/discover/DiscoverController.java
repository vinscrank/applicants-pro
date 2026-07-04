package com.interview.discover;

import com.fasterxml.jackson.databind.JsonNode;
import com.interview.auth.AuthService;
import com.interview.domain.User;
import com.interview.service.DiscoverSearchService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/offerte")
public class DiscoverController {

    private final AuthService authService;
    private final DiscoverSearchService discoverSearchService;

    public DiscoverController(AuthService authService, DiscoverSearchService discoverSearchService) {
        this.authService = authService;
        this.discoverSearchService = discoverSearchService;
    }

    @GetMapping("/search/default")
    public Map<String, Object> defaultCommand() {
        return Map.of(
                "command_text", "",
                "command", Map.of("prompt_text", ""));
    }

    @PostMapping("/search/parse")
    public JsonNode parseSearch(@RequestBody JsonNode body) {
        Integer userId = currentUser().getId();
        String promptText = body.path("prompt_text").asText(body.path("prompt").asText(""));
        JsonNode command = body.get("command");
        return discoverSearchService.parseSearch(userId, promptText, command);
    }

    @PostMapping("/search")
    public JsonNode runSearch(@RequestBody JsonNode body) {
        Integer userId = currentUser().getId();
        JsonNode command = body.get("command");
        JsonNode preferences = body.get("preferences_override");
        boolean persist = !body.has("persist") || body.get("persist").asBoolean(true);
        return discoverSearchService.runSearch(userId, command, preferences, persist);
    }

    @GetMapping("/searches/latest")
    public JsonNode latestSearch() {
        return discoverSearchService.getLatestSearch(currentUser().getId());
    }

    @GetMapping("/searches")
    public List<JsonNode> searchHistory(@RequestParam(defaultValue = "50") int limit) {
        return discoverSearchService.listSearchSummaries(currentUser().getId(), limit);
    }

    @GetMapping("/searches/{id}")
    public JsonNode getSearch(@PathVariable Integer id) {
        try {
            return discoverSearchService.getSearch(currentUser().getId(), id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    @GetMapping("/preferences")
    public JsonNode getPreferences() {
        return discoverSearchService.getPreferences(currentUser().getId());
    }

    @PutMapping("/preferences")
    public JsonNode savePreferences(@RequestBody JsonNode body) {
        return discoverSearchService.savePreferences(currentUser().getId(), body);
    }

    @GetMapping("/llm/stats")
    public JsonNode llmStats() {
        return discoverSearchService.llmStats();
    }

    @PutMapping("/llm/budget")
    public JsonNode updateLlmBudget(@RequestBody JsonNode body) {
        return discoverSearchService.updateLlmBudget(body.path("monthly_budget_usd").asDouble(50.0));
    }

    @PutMapping("/llm/controls")
    public JsonNode updateLlmControls(@RequestBody JsonNode body) {
        return discoverSearchService.updateLlmControls(body);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authService.getUserByEmail(auth.getName());
    }
}
