package com.interview.discover;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interview.domain.MonitoredCompany;
import com.interview.repository.MonitoredCompanyRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MonitoredCompanyService {

    private final MonitoredCompanyRepository repository;
    private final ObjectMapper objectMapper;

    public MonitoredCompanyService(MonitoredCompanyRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public ArrayNode listCompanies(boolean includeInactive) {
        List<MonitoredCompany> rows = includeInactive
                ? repository.findAllByOrderByPriorityDescNameAsc()
                : repository.findByActiveTrueOrderByPriorityDescNameAsc();
        ArrayNode array = objectMapper.createArrayNode();
        rows.forEach(row -> array.add(toNode(row)));
        return array;
    }

    public ObjectNode getCompany(Integer companyId) {
        MonitoredCompany row = repository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        return toNode(row);
    }

    @Transactional
    public ObjectNode createCompany(JsonNode body) {
        String name = text(body, "name");
        String slug = text(body, "slug");
        String ats = text(body, "ats");
        if (ats.isBlank()) {
            ats = "website";
        }
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug is required");
        }
        if (repository.existsByAtsAndSlug(ats, slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Company with same ATS and slug already exists");
        }

        MonitoredCompany row = new MonitoredCompany();
        row.setName(name);
        row.setAts(ats);
        row.setSlug(slug);
        row.setCareersUrl(text(body, "careers_url"));
        row.setActive(!body.has("active") || body.get("active").asBoolean(true));
        row.setPriority(body.has("priority") && body.get("priority").asBoolean(false));
        row.setSource("manual");
        row.setJobCount(0);
        row.setDiscoveredAt(LocalDateTime.now());
        return toNode(repository.save(row));
    }

    @Transactional
    public ObjectNode updateCompany(Integer companyId, JsonNode body) {
        MonitoredCompany row = repository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));

        if (body.has("name")) {
            String name = text(body, "name");
            if (name.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
            }
            row.setName(name);
        }
        String nextAts = body.has("ats") ? text(body, "ats") : row.getAts();
        String nextSlug = body.has("slug") ? text(body, "slug") : row.getSlug();
        if (body.has("ats") || body.has("slug")) {
            if (nextSlug.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug is required");
            }
            if (repository.existsByAtsAndSlugAndIdNot(nextAts, nextSlug, companyId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Company with same ATS and slug already exists");
            }
            row.setAts(nextAts);
            row.setSlug(nextSlug);
        }
        if (body.has("careers_url")) {
            row.setCareersUrl(text(body, "careers_url"));
        }
        if (body.has("active")) {
            row.setActive(body.get("active").asBoolean());
        }
        if (body.has("priority")) {
            row.setPriority(body.get("priority").asBoolean());
        }
        if (body.has("job_count")) {
            row.setJobCount(body.get("job_count").asInt());
        }
        return toNode(repository.save(row));
    }

    @Transactional
    public ObjectNode deactivateCompany(Integer companyId) {
        MonitoredCompany row = repository.findById(companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
        row.setActive(false);
        repository.save(row);
        ObjectNode result = objectMapper.createObjectNode();
        result.put("ok", true);
        result.put("company_id", companyId);
        return result;
    }

    private ObjectNode toNode(MonitoredCompany row) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", row.getId());
        node.put("name", row.getName());
        node.put("ats", row.getAts());
        node.put("slug", row.getSlug());
        node.put("careers_url", row.getCareersUrl() != null ? row.getCareersUrl() : "");
        node.put("job_count", row.getJobCount() != null ? row.getJobCount() : 0);
        node.put("active", row.isActive());
        node.put("source", row.getSource() != null ? row.getSource() : "manual");
        if (row.getDiscoveredAt() != null) {
            node.put("discovered_at", row.getDiscoveredAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        } else {
            node.putNull("discovered_at");
        }
        node.put("priority", row.isPriority());
        return node;
    }

    private static String text(JsonNode body, String field) {
        if (!body.has(field) || body.get(field).isNull()) {
            return "";
        }
        return body.get(field).asText("").trim();
    }
}
