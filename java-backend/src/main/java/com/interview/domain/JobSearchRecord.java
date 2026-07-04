package com.interview.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_searches")
public class JobSearchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "searched_at", nullable = false)
    private LocalDateTime searchedAt;

    @Column(name = "total_found", nullable = false)
    private Integer totalFound;

    @Column(name = "verified_count", nullable = false)
    private Integer verifiedCount;

    @Column(name = "maybe_count", nullable = false)
    private Integer maybeCount;

    @Column(name = "rejected_count", nullable = false)
    private Integer rejectedCount;

    @Column(name = "command_json", nullable = false, columnDefinition = "TEXT")
    private String commandJson;

    @OneToMany(mappedBy = "search", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobSearchOffer> offers = new ArrayList<>();

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public LocalDateTime getSearchedAt() {
        return searchedAt;
    }

    public void setSearchedAt(LocalDateTime searchedAt) {
        this.searchedAt = searchedAt;
    }

    public Integer getTotalFound() {
        return totalFound;
    }

    public void setTotalFound(Integer totalFound) {
        this.totalFound = totalFound;
    }

    public Integer getVerifiedCount() {
        return verifiedCount;
    }

    public void setVerifiedCount(Integer verifiedCount) {
        this.verifiedCount = verifiedCount;
    }

    public Integer getMaybeCount() {
        return maybeCount;
    }

    public void setMaybeCount(Integer maybeCount) {
        this.maybeCount = maybeCount;
    }

    public Integer getRejectedCount() {
        return rejectedCount;
    }

    public void setRejectedCount(Integer rejectedCount) {
        this.rejectedCount = rejectedCount;
    }

    public String getCommandJson() {
        return commandJson;
    }

    public void setCommandJson(String commandJson) {
        this.commandJson = commandJson;
    }

    public List<JobSearchOffer> getOffers() {
        return offers;
    }

    public void setOffers(List<JobSearchOffer> offers) {
        this.offers = offers;
    }
}
