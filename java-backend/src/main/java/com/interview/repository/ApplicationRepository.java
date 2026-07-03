package com.interview.repository;

import com.interview.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Integer> {
  List<Application> findByUserIdOrderByCreatedAtDesc(Integer userId);

}