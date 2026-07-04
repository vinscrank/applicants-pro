package com.interview.repository;

import com.interview.domain.JobAppliedOffer;
import com.interview.domain.JobAppliedOfferId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobAppliedOfferRepository extends JpaRepository<JobAppliedOffer, JobAppliedOfferId> {
}
