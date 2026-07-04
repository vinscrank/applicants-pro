package com.interview.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "monitored_companies",
        uniqueConstraints = @UniqueConstraint(name = "uq_monitored_ats_slug", columnNames = {"ats", "slug"}))
public class MonitoredCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 32)
    private String ats;

    @Column(nullable = false, length = 255)
    private String slug;

    @Column(name = "careers_url", nullable = false, length = 1000)
    private String careersUrl = "";

    @Column(name = "job_count", nullable = false)
    private Integer jobCount = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, length = 32)
    private String source = "manual";

    @Column(name = "discovered_at", nullable = false)
    private LocalDateTime discoveredAt;

    @Column(nullable = false)
    private boolean priority = false;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAts() {
        return ats;
    }

    public void setAts(String ats) {
        this.ats = ats;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getCareersUrl() {
        return careersUrl;
    }

    public void setCareersUrl(String careersUrl) {
        this.careersUrl = careersUrl;
    }

    public Integer getJobCount() {
        return jobCount;
    }

    public void setJobCount(Integer jobCount) {
        this.jobCount = jobCount;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getDiscoveredAt() {
        return discoveredAt;
    }

    public void setDiscoveredAt(LocalDateTime discoveredAt) {
        this.discoveredAt = discoveredAt;
    }

    public boolean isPriority() {
        return priority;
    }

    public void setPriority(boolean priority) {
        this.priority = priority;
    }
}
