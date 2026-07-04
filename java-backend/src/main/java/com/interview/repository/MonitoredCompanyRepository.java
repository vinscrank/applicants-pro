package com.interview.repository;

import com.interview.domain.MonitoredCompany;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonitoredCompanyRepository extends JpaRepository<MonitoredCompany, Integer> {

    List<MonitoredCompany> findAllByOrderByPriorityDescNameAsc();

    List<MonitoredCompany> findByActiveTrueOrderByPriorityDescNameAsc();

    Optional<MonitoredCompany> findByAtsAndSlug(String ats, String slug);

    boolean existsByAtsAndSlugAndIdNot(String ats, String slug, Integer id);

    boolean existsByAtsAndSlug(String ats, String slug);
}
