package com.interview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interview.domain.JobSearchOffer;
import com.interview.domain.JobSearchRecord;
import com.interview.domain.UserSearchPreferences;
import com.interview.repository.JobSearchRecordRepository;
import com.interview.repository.UserSearchPreferencesRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiscoverSearchService {

    private static final String DEFAULT_PREFERENCES_JSON =
            "{\"default_locations\":[],\"origins\":[],\"posted_within\":\"any\",\"min_status\":\"all\",\"sort_by\":\"posted_desc\",\"require_active_apply\":true}";

    private final PythonSearchClient pythonClient;
    private final JobSearchRecordRepository searchRepository;
    private final UserSearchPreferencesRepository preferencesRepository;
    private final ObjectMapper objectMapper;

    public DiscoverSearchService(
            PythonSearchClient pythonClient,
            JobSearchRecordRepository searchRepository,
            UserSearchPreferencesRepository preferencesRepository,
            ObjectMapper objectMapper) {
        this.pythonClient = pythonClient;
        this.searchRepository = searchRepository;
        this.preferencesRepository = preferencesRepository;
        this.objectMapper = objectMapper;
    }

    public JsonNode parseSearch(Integer userId, String promptText, JsonNode command) {
        return pythonClient.parseSearch(userId, promptText, command);
    }

    @Transactional
    public JsonNode runSearch(Integer userId, JsonNode command, JsonNode preferencesOverride, boolean persist) {
        JsonNode prefs = preferencesOverride != null && !preferencesOverride.isNull()
                ? preferencesOverride
                : getPreferencesNode(userId);
        JsonNode result = pythonClient.runSearch(userId, command, prefs);
        if (!persist) {
            return result;
        }
        Integer searchId = saveSearch(userId, result);
        ObjectNode mutable = result.deepCopy();
        mutable.put("id", searchId);
        return mutable;
    }

    @Transactional(readOnly = true)
    public JsonNode getLatestSearch(Integer userId) {
        return searchRepository.findFirstByUserIdOrderBySearchedAtDesc(userId)
                .map(this::toResultNode)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<JsonNode> listSearchSummaries(Integer userId, int limit) {
        List<JobSearchRecord> rows = searchRepository.findByUserIdOrderBySearchedAtDesc(userId);
        List<JsonNode> summaries = new ArrayList<>();
        int count = 0;
        for (JobSearchRecord row : rows) {
            if (count >= limit) {
                break;
            }
            summaries.add(toSummaryNode(row));
            count++;
        }
        return summaries;
    }

    @Transactional(readOnly = true)
    public JsonNode getSearch(Integer userId, Integer searchId) {
        JobSearchRecord search = searchRepository.findWithOffersByIdAndUserId(searchId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Search not found"));
        return toResultNode(search);
    }

    public JsonNode getPreferences(Integer userId) {
        return getPreferencesNode(userId);
    }

    @Transactional
    public JsonNode savePreferences(Integer userId, JsonNode preferences) {
        UserSearchPreferences row = preferencesRepository.findById(userId).orElseGet(UserSearchPreferences::new);
        row.setUserId(userId);
        row.setPreferencesJson(preferences.toString());
        row.setUpdatedAt(LocalDateTime.now());
        preferencesRepository.save(row);
        return preferences;
    }

    public JsonNode llmStats() {
        return pythonClient.llmStats();
    }

    public JsonNode updateLlmBudget(double monthlyBudgetUsd) {
        return pythonClient.updateLlmBudget(monthlyBudgetUsd);
    }

    public JsonNode updateLlmControls(JsonNode controls) {
        return pythonClient.updateLlmControls(controls);
    }

    private JsonNode getPreferencesNode(Integer userId) {
        return preferencesRepository.findById(userId)
                .map(row -> readTree(row.getPreferencesJson()))
                .orElse(readTree(DEFAULT_PREFERENCES_JSON));
    }

    @Transactional
    Integer saveSearch(Integer userId, JsonNode result) {
        JobSearchRecord search = new JobSearchRecord();
        search.setUserId(userId);
        search.setSearchedAt(parseDateTime(result.path("searched_at").asText(null)));
        search.setTotalFound(result.path("total_found").asInt(0));
        search.setVerifiedCount(result.path("verified_count").asInt(0));
        search.setMaybeCount(result.path("maybe_count").asInt(0));
        search.setRejectedCount(result.path("rejected_count").asInt(0));
        search.setCommandJson(result.path("command").toString());

        JsonNode pool = result.has("offer_pool") && result.get("offer_pool").isArray()
                ? result.get("offer_pool")
                : result.get("offers");
        List<JobSearchOffer> offers = new ArrayList<>();
        if (pool != null && pool.isArray()) {
            for (JsonNode offerNode : pool) {
                offers.add(toOfferEntity(search, offerNode));
            }
        }
        search.setOffers(offers);
        return searchRepository.save(search).getId();
    }

    private JobSearchOffer toOfferEntity(JobSearchRecord search, JsonNode node) {
        JobSearchOffer offer = new JobSearchOffer();
        offer.setSearch(search);
        offer.setOfferId(node.path("id").asText(""));
        offer.setCompany(node.path("company").asText(""));
        offer.setRole(node.path("role").asText(""));
        offer.setApplyUrl(node.path("apply_url").asText(""));
        offer.setSource(node.path("source").asText(""));
        offer.setPostedAt(textOrNull(node, "posted_at"));
        offer.setLanguageRequirement(textOrNull(node, "language_requirement"));
        offer.setSeniority(node.path("seniority").asText("unknown"));
        offer.setWebDevFit(node.path("web_dev_fit").asInt(0));
        offer.setWebDevFitLabel(node.path("web_dev_fit_label").asText(""));
        offer.setStatus(node.path("status").asText("verified"));
        offer.setStatusReason(node.path("status_reason").asText(""));
        offer.setLocation(textOrNull(node, "location"));
        offer.setOrigin(node.path("origin").asText("ats"));
        offer.setVerifiedAt(parseDateTime(node.path("verified_at").asText(null)));
        return offer;
    }

    private JsonNode toResultNode(JobSearchRecord search) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("id", search.getId());
        result.set("command", readTree(search.getCommandJson()));
        result.set("preferences", getPreferencesNode(search.getUserId()));
        result.put("searched_at", formatDateTime(search.getSearchedAt()));
        result.put("total_found", search.getTotalFound());
        result.put("verified_count", search.getVerifiedCount());
        result.put("maybe_count", search.getMaybeCount());
        result.put("rejected_count", search.getRejectedCount());

        ArrayNode offers = objectMapper.createArrayNode();
        ArrayNode pool = objectMapper.createArrayNode();
        search.getOffers().stream()
                .sorted(Comparator.comparing(JobSearchOffer::getId))
                .forEach(offer -> {
                    JsonNode node = toOfferNode(offer);
                    offers.add(node);
                    pool.add(node.deepCopy());
                });
        result.set("offers", offers);
        result.set("offer_pool", pool);
        return result;
    }

    private JsonNode toSummaryNode(JobSearchRecord search) {
        ObjectNode summary = objectMapper.createObjectNode();
        summary.put("id", search.getId());
        summary.put("searched_at", formatDateTime(search.getSearchedAt()));
        summary.put("total_found", search.getTotalFound());
        summary.put("verified_count", search.getVerifiedCount());
        summary.put("maybe_count", search.getMaybeCount());
        summary.put("rejected_count", search.getRejectedCount());
        JsonNode command = readTree(search.getCommandJson());
        summary.put("prompt_text", command.path("prompt_text").asText("").substring(0, Math.min(120, command.path("prompt_text").asText("").length())));
        summary.set("locations", command.path("locations"));
        summary.set("allowed_roles", command.path("allowed_roles"));
        return summary;
    }

    private ObjectNode toOfferNode(JobSearchOffer offer) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", offer.getOfferId());
        node.put("company", offer.getCompany());
        node.put("role", offer.getRole());
        node.put("apply_url", offer.getApplyUrl());
        node.put("source", offer.getSource());
        if (offer.getPostedAt() != null) {
            node.put("posted_at", offer.getPostedAt());
        }
        if (offer.getLanguageRequirement() != null) {
            node.put("language_requirement", offer.getLanguageRequirement());
        }
        node.put("seniority", offer.getSeniority());
        node.put("web_dev_fit", offer.getWebDevFit());
        node.put("web_dev_fit_label", offer.getWebDevFitLabel());
        node.put("status", offer.getStatus());
        node.put("status_reason", offer.getStatusReason());
        if (offer.getLocation() != null) {
            node.put("location", offer.getLocation());
        }
        node.put("origin", offer.getOrigin());
        node.put("verified_at", formatDateTime(offer.getVerifiedAt()));
        node.put("applied", false);
        node.put("user_dismissed", false);
        node.put("historical", false);
        node.put("profile_fit_score", 0);
        node.put("profile_fit_label", "");
        node.put("profile_fit_available", false);
        return node;
    }

    private JsonNode readTree(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            return objectMapper.createObjectNode();
        }
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(value.replace("Z", "").substring(0, Math.min(19, value.length())));
        } catch (Exception ex) {
            return LocalDateTime.now();
        }
    }

    private String formatDateTime(LocalDateTime value) {
        return value.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
