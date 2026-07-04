package com.interview.repository;

import com.interview.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Integer> {
  List<Application> findByUserIdOrderByCreatedAtDesc(Integer userId);

  Optional<Application> findByIdAndUserId(Integer id, Integer userId);

  Optional<Application> findFirstByUserIdAndJobUrlOrderByIdDesc(Integer userId, String jobUrl);

  Optional<Application> findFirstByUserIdAndLinkedOfferIdOrderByIdDesc(Integer userId, String linkedOfferId);

  @Query("""
          SELECT a FROM Application a
          WHERE a.userId = :userId
            AND a.applicationSource = 'live_jobs'
            AND a.notes LIKE CONCAT('%offer:', :offerId, '%')
          ORDER BY a.id DESC
          LIMIT 1
          """)
  Optional<Application> findByUserIdAndOfferMarker(
          @Param("userId") Integer userId, @Param("offerId") String offerId);

  List<Application> findByUserIdAndStatusNotOrderByUpdatedAtDesc(Integer userId, String status);
}