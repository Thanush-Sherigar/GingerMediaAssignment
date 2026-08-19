package com.pipeline.repository;

import com.pipeline.model.ImageJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ImageJobRepository extends JpaRepository<ImageJob, UUID> {
    // Spring Data JPA automatically provides basic CRUD operations:
    // .save(), .findById(), .findAll(), .deleteById(), etc.
}