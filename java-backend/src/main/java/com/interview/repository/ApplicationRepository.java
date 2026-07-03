package com.interview.repository;

import com.interview.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Integer> {
  List<Application> findByUserIdOrderByCreatedAtDesc(Integer userId);

  Optional<Application> findByIdAndUserId(Integer id, Integer userId);

}