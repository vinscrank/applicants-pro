package com.interview.repository;

import com.interview.domain.JobSearchRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobSearchRecordRepository extends JpaRepository<JobSearchRecord, Integer> {

    @EntityGraph(attributePaths = "offers")
    Optional<JobSearchRecord> findFirstByUserIdOrderBySearchedAtDesc(Integer userId);

    List<JobSearchRecord> findByUserIdOrderBySearchedAtDesc(Integer userId);

    @EntityGraph(attributePaths = "offers")
    Optional<JobSearchRecord> findWithOffersByIdAndUserId(Integer id, Integer userId);
}
