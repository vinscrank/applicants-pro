package com.interview.discover;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interview.auth.AuthService;
import com.interview.domain.User;
import com.interview.service.DiscoverSearchService;
import com.interview.service.PythonJobsClient;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/jobs")
public class DiscoverController {

    private final AuthService authService;
    private final DiscoverSearchService discoverSearchService;
    private final PythonJobsClient pythonJobsClient;
    private final OfferStateService offerStateService;
    private final OfferTrackService offerTrackService;
    private final MonitoredCompanyService monitoredCompanyService;
    private final JobPageEmbedService jobPageEmbedService;

    public DiscoverController(
            AuthService authService,
            DiscoverSearchService discoverSearchService,
            PythonJobsClient pythonJobsClient,
            OfferStateService offerStateService,
            OfferTrackService offerTrackService,
            MonitoredCompanyService monitoredCompanyService,
            JobPageEmbedService jobPageEmbedService) {
        this.authService = authService;
        this.discoverSearchService = discoverSearchService;
        this.pythonJobsClient = pythonJobsClient;
        this.offerStateService = offerStateService;
        this.offerTrackService = offerTrackService;
        this.monitoredCompanyService = monitoredCompanyService;
        this.jobPageEmbedService = jobPageEmbedService;
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

    @PutMapping("/offers/{offerId}/applied")
    public JsonNode updateOfferApplied(@PathVariable String offerId, @RequestBody JsonNode body) {
        Integer userId = currentUser().getId();
        boolean applied = body.path("applied").asBoolean(false);
        return offerStateService.setApplied(userId, offerId, applied);
    }

    @PutMapping("/offers/{offerId}/dismissed")
    public JsonNode updateOfferDismissed(@PathVariable String offerId, @RequestBody JsonNode body) {
        Integer userId = currentUser().getId();
        boolean dismissed = body.path("dismissed").asBoolean(false);
        String applyUrl = body.path("apply_url").asText("");
        String company = body.path("company").asText("");
        String role = body.path("role").asText("");
        return offerStateService.setDismissed(userId, offerId, dismissed, applyUrl, company, role);
    }

    @PostMapping("/offers/{offerId}/track")
    public JsonNode trackOffer(@PathVariable String offerId, @RequestBody JsonNode body) {
        return offerTrackService.trackOffer(currentUser().getId(), offerId, body);
    }

    @PostMapping("/analyze-url")
    public JsonNode analyzeUrl(@RequestBody JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/analyze-url", body);
    }

    @GetMapping(value = "/page-embed", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> pageEmbed(@RequestParam String url) {
        String html = jobPageEmbedService.embedPage(url);
        return ResponseEntity.ok()
                .header("Cache-Control", "private, max-age=300")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @PostMapping("/analyze-url/track")
    public JsonNode trackAnalyzedUrl(@RequestBody JsonNode body) {
        return offerTrackService.trackAnalyzedUrl(currentUser().getId(), body);
    }

    @GetMapping("/companies")
    public ArrayNode listCompanies(
            @RequestParam(name = "include_inactive", defaultValue = "false") boolean includeInactive) {
        return monitoredCompanyService.listCompanies(includeInactive);
    }

    @GetMapping("/companies/{companyId}")
    public JsonNode getCompany(@PathVariable Integer companyId) {
        return monitoredCompanyService.getCompany(companyId);
    }

    @PostMapping("/companies")
    public JsonNode createCompany(@RequestBody JsonNode body) {
        return monitoredCompanyService.createCompany(body);
    }

    @PutMapping("/companies/{companyId}")
    public JsonNode updateCompany(@PathVariable Integer companyId, @RequestBody JsonNode body) {
        return monitoredCompanyService.updateCompany(companyId, body);
    }

    @DeleteMapping("/companies/{companyId}")
    public JsonNode deleteCompany(@PathVariable Integer companyId) {
        return monitoredCompanyService.deactivateCompany(companyId);
    }

    @PostMapping("/companies/{companyId}/scan")
    public JsonNode scanCompany(@PathVariable Integer companyId, @RequestBody(required = false) JsonNode body) {
        return pythonJobsClient.post(
                currentUser().getId(), "/companies/" + companyId + "/scan", body);
    }

    @PostMapping("/companies/scan-all-recent")
    public JsonNode scanAllRecent(@RequestBody(required = false) JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/companies/scan-all-recent", body);
    }

    @PostMapping("/companies/scan-all-search")
    public JsonNode scanAllSearch(@RequestBody JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/companies/scan-all-search", body);
    }

    @PostMapping("/companies/discover-url")
    public JsonNode discoverCompanyUrl(@RequestBody JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/companies/discover-url", body);
    }

    @PostMapping("/companies/discover-name")
    public JsonNode discoverCompanyName(@RequestBody JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/companies/discover-name", body);
    }

    @PostMapping("/companies/auto-discover")
    public JsonNode autoDiscoverCompanies(@RequestBody(required = false) JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/companies/auto-discover", body);
    }

    @PostMapping("/offers/profile-fit")
    public JsonNode enrichOffersProfileFit(@RequestBody JsonNode body) {
        return pythonJobsClient.post(currentUser().getId(), "/offers/profile-fit", body);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authService.getUserByEmail(auth.getName());
    }
}
