package com.interview.repository;

import com.interview.domain.OfferteDismissedOffer;
import com.interview.domain.OfferteDismissedOfferId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OfferteDismissedOfferRepository extends JpaRepository<OfferteDismissedOffer, OfferteDismissedOfferId> {

    List<OfferteDismissedOffer> findByUserId(Integer userId);

    @Modifying
    @Query("""
            DELETE FROM OfferteDismissedOffer d
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
