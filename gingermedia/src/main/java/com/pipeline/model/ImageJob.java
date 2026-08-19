package com.pipeline.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "image_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageJob {

    @Id
    private UUID id;

    private String fileName;
    private String filePath;
    private String mimeType;

    @Enumerated(EnumType.STRING)
    private Status status; // PENDING, PROCESSING, COMPLETED, FAILED

    private String failureReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String analysisResults;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, PROCESSING, COMPLETED, FAILED
    }
}