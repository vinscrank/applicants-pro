package com.interview.repository;

import com.interview.domain.JobSearchOffer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobSearchOfferRepository extends JpaRepository<JobSearchOffer, Integer> {

    @Query("""
            SELECT o FROM JobSearchOffer o
            JOIN o.search s
            WHERE s.userId = :userId AND o.offerId = :offerId
            ORDER BY o.id DESC
            """)
    List<JobSearchOffer> findLatestForUserAndOfferId(
            @Param("userId") Integer userId, @Param("offerId") String offerId, Pageable pageable);

    default Optional<JobSearchOffer> findLatestForUserAndOfferId(Integer userId, String offerId) {
        return findLatestForUserAndOfferId(userId, offerId, Pageable.ofSize(1)).stream().findFirst();
    }
}
