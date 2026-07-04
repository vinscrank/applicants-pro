package com.interview.repository;

import com.interview.domain.JobDismissedOffer;
import com.interview.domain.JobDismissedOfferId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobDismissedOfferRepository extends JpaRepository<JobDismissedOffer, JobDismissedOfferId> {

    List<JobDismissedOffer> findByUserId(Integer userId);

    @Modifying
    @Query("""
            DELETE FROM JobDismissedOffer d
            WHERE d.userId = :userId
              AND (d.offerId = :offerId
                   OR (:urlNorm IS NOT NULL AND d.applyUrlNorm = :urlNorm)
                   OR (:companyNorm IS NOT NULL AND :roleNorm IS NOT NULL
                       AND d.companyNorm = :companyNorm AND d.roleNorm = :roleNorm))
            """)
    int deleteMatches(
            @Param("userId") Integer userId,
            @Param("offerId") String offerId,
            @Param("urlNorm") String urlNorm,
            @Param("companyNorm") String companyNorm,
            @Param("roleNorm") String roleNorm);
}
