package com.interview.repository;

import com.interview.domain.UserSearchPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSearchPreferencesRepository extends JpaRepository<UserSearchPreferences, Integer> {
}
