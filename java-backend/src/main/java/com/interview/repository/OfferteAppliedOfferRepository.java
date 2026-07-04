package com.interview.repository;

import com.interview.domain.OfferteAppliedOffer;
import com.interview.domain.OfferteAppliedOfferId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfferteAppliedOfferRepository extends JpaRepository<OfferteAppliedOffer, OfferteAppliedOfferId> {
}
