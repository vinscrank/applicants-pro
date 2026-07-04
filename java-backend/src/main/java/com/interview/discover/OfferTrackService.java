package com.interview.discover;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interview.domain.Application;
import com.interview.graphql.dto.CreateApplicationInput;
import com.interview.graphql.dto.UpdateApplicationInput;
import com.interview.repository.ApplicationRepository;
import com.interview.service.ApplicationService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OfferTrackService {

    private static final Map<String, String> SOURCE_METHOD = Map.ofEntries(
            Map.entry("greenhouse", "company_website"),
            Map.entry("lever", "company_website"),
            Map.entry("workable", "company_website"),
            Map.entry("ashby", "company_website"),
            Map.entry("linkedin", "linkedin"),
            Map.entry("indeed", "indeed"),
            Map.entry("upwork", "job_board"));

    private static final Set<String> VALID_SOURCES = Set.of(
            "manual", "quick_add", "live_jobs", "careers", "extension");

    private static final Set<String> VALID_REMOTE = Set.of("remote", "hybrid", "onsite", "unknown");

    private final ApplicationService applicationService;
    private final ApplicationRepository applicationRepository;
    private final OfferStateService offerStateService;
    private final ObjectMapper objectMapper;

    public OfferTrackService(
            ApplicationService applicationService,
            ApplicationRepository applicationRepository,
            OfferStateService offerStateService,
            ObjectMapper objectMapper) {
        this.applicationService = applicationService;
        this.applicationRepository = applicationRepository;
        this.offerStateService = offerStateService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ObjectNode trackOffer(Integer userId, String offerId, JsonNode body) {
        String company = text(body, "company");
        String role = text(body, "role");
        if (company.isBlank() || role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company and role are required");
        }
        boolean finalize = !body.has("finalize") || body.get("finalize").asBoolean(true);
        if (!finalize) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Tracker entry is created only on completion");
        }

        String applyUrl = JobUrlNormalizer.persistJobUrl(text(body, "apply_url"));
        String location = blankToNull(text(body, "location"));
        String source = text(body, "source");
        String method = applicationMethodFromSource(source);
        String notes = offerNotes(source, offerId);

        Optional<Application> existing = findExistingApplication(userId, offerId, applyUrl);
        boolean created;
        Application application;
        if (existing.isPresent()) {
            application = existing.get();
            applicationService.updateForUser(
                    userId,
                    buildUpdateInput(
                            application.getId(),
                            applyUrl.isBlank() ? null : applyUrl,
                            location,
                            method,
                            "live_jobs",
                            offerId,
                            notes));
            application = applicationService.getForUser(userId, application.getId());
            created = false;
        } else {
            application = applicationService.createForUser(
                    userId,
                    buildCreateInput(
                            company.trim(),
                            role.trim(),
                            applyUrl.isBlank() ? null : applyUrl,
                            location,
                            "unknown",
                            method,
                            "live_jobs",
                            offerId,
                            notes));
            created = true;
        }

        offerStateService.setApplied(userId, offerId, true);

        ObjectNode result = objectMapper.createObjectNode();
        result.put("offer_id", offerId);
        result.put("applied", true);
        result.put("application_id", application.getId());
        result.put("created", created);
        result.put("already_applied", !created);
        if (!created) {
            result.set("tracker_match", trackerMatch(application));
        } else {
            result.putNull("tracker_match");
        }
        return result;
    }

    @Transactional
    public ObjectNode trackAnalyzedUrl(Integer userId, JsonNode body) {
        String company = text(body, "company");
        String role = text(body, "role");
        String url = JobUrlNormalizer.persistJobUrl(text(body, "url"));
        if (company.isBlank() || role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company and role are required");
        }

        boolean allowDuplicate = body.path("allow_duplicate").asBoolean(false);
        if (!allowDuplicate) {
            Optional<Application> existing = findApplicationForJob(userId, url, company, role);
            if (existing.isPresent()) {
                ObjectNode result = objectMapper.createObjectNode();
                result.put("application_id", existing.get().getId());
                result.put("created", false);
                result.put("already_applied", true);
                result.set("tracker_match", trackerMatch(existing.get()));
                result.putArray("live_offer_matches");
                return result;
            }
        }

        String location = blankToNull(text(body, "location"));
        String method = resolveApplicationMethod(text(body, "application_method"));
        String remoteType = VALID_REMOTE.contains(text(body, "remote_type"))
                ? text(body, "remote_type")
                : "unknown";
        String source = text(body, "application_source");
        if (!VALID_SOURCES.contains(source)) {
            source = "manual";
        }
        String notes = text(body, "notes");

        Application application = applicationService.createForUser(
                userId,
                buildCreateInput(
                        company.trim(),
                        role.trim(),
                        url.isBlank() ? null : url,
                        location,
                        remoteType,
                        method,
                        source,
                        null,
                        notes.isBlank() ? null : notes));

        ObjectNode result = objectMapper.createObjectNode();
        result.put("application_id", application.getId());
        result.put("created", true);
        result.put("already_applied", false);
        result.putNull("tracker_match");
        result.putArray("live_offer_matches");
        return result;
    }

    private Optional<Application> findExistingApplication(Integer userId, String offerId, String jobUrl) {
        Optional<Application> byMarker = applicationRepository.findByUserIdAndOfferMarker(userId, offerId);
        if (byMarker.isPresent()) {
            return byMarker;
        }
        if (!jobUrl.isBlank()) {
            Optional<Application> byUrl = applicationRepository.findFirstByUserIdAndJobUrlOrderByIdDesc(userId, jobUrl);
            if (byUrl.isPresent()) {
                return byUrl;
            }
        }
        return applicationRepository.findFirstByUserIdAndLinkedOfferIdOrderByIdDesc(userId, offerId);
    }

    private Optional<Application> findApplicationForJob(
            Integer userId, String jobUrl, String company, String role) {
        if (!jobUrl.isBlank()) {
            Optional<Application> byUrl = applicationRepository.findFirstByUserIdAndJobUrlOrderByIdDesc(userId, jobUrl);
            if (byUrl.isPresent()) {
                return byUrl;
            }
        }
        String companyKey = JobUrlNormalizer.normalizeMatchText(company);
        String roleKey = JobUrlNormalizer.normalizeMatchText(role);
        for (Application app : applicationRepository.findByUserIdAndStatusNotOrderByUpdatedAtDesc(userId, "draft")) {
            if (JobUrlNormalizer.normalizeMatchText(app.getCompanyName()).equals(companyKey)
                    && rolesCompatible(app.getJobTitle(), role)) {
                return Optional.of(app);
            }
        }
        return Optional.empty();
    }

    private static boolean rolesCompatible(String stored, String candidate) {
        String a = JobUrlNormalizer.normalizeMatchText(stored).replaceAll("[^a-z0-9]", "");
        String b = JobUrlNormalizer.normalizeMatchText(candidate).replaceAll("[^a-z0-9]", "");
        if (a.isBlank() || b.isBlank()) {
            return false;
        }
        if (a.equals(b)) {
            return true;
        }
        String shorter = a.length() <= b.length() ? a : b;
        String longer = a.length() > b.length() ? a : b;
        return shorter.length() >= 10 && longer.contains(shorter);
    }

    private ObjectNode trackerMatch(Application application) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("application_id", application.getId());
        node.put("company_name", application.getCompanyName());
        node.put("job_title", application.getJobTitle());
        node.put("status", application.getStatus());
        LocalDateTime appliedAt = application.getLastAppliedAt() != null
                ? application.getLastAppliedAt()
                : application.getCreatedAt().atStartOfDay();
        node.put("last_applied_at", appliedAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        node.put("application_source", application.getApplicationSource());
        return node;
    }

    private static String offerNotes(String source, String offerId) {
        return "Live Jobs · " + (source.isBlank() ? "ATS" : source) + " · offer:" + offerId;
    }

    private static String applicationMethodFromSource(String source) {
        if (source == null || source.isBlank()) {
            return "company_website";
        }
        return SOURCE_METHOD.getOrDefault(source.trim().toLowerCase(Locale.ROOT), "company_website");
    }

    private static String resolveApplicationMethod(String value) {
        String key = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (Set.of(
                        "linkedin",
                        "company_website",
                        "indeed",
                        "other",
                        "email",
                        "recruiter",
                        "referral",
                        "job_board")
                .contains(key)) {
            return key;
        }
        return applicationMethodFromSource(key);
    }

    private static CreateApplicationInput buildCreateInput(
            String companyName,
            String jobTitle,
            String jobUrl,
            String location,
            String remoteType,
            String applicationMethod,
            String applicationSource,
            String linkedOfferId,
            String notes) {
        return new CreateApplicationInput(
                companyName,
                jobTitle,
                jobUrl,
                null,
                null,
                location,
                "applied",
                "medium",
                remoteType,
                applicationMethod,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDateTime.now().toString(),
                applicationSource,
                linkedOfferId,
                notes);
    }

    private static UpdateApplicationInput buildUpdateInput(
            Integer applicationId,
            String jobUrl,
            String location,
            String applicationMethod,
            String applicationSource,
            String linkedOfferId,
            String notes) {
        return new UpdateApplicationInput(
                String.valueOf(applicationId),
                null,
                null,
                jobUrl,
                null,
                null,
                location,
                "applied",
                null,
                null,
                applicationMethod,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDateTime.now().toString(),
                applicationSource,
                linkedOfferId,
                notes);
    }

    private static String text(JsonNode body, String field) {
        if (body == null || !body.has(field) || body.get(field).isNull()) {
            return "";
        }
        return body.get(field).asText("").trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
