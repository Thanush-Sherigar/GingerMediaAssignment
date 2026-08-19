package com.pipeline.controller;

import com.pipeline.config.RabbitConfig;
import com.pipeline.model.ImageJob;
import com.pipeline.repository.ImageJobRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/images")
public class ImageController {

    private final ImageJobRepository repository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public ImageController(ImageJobRepository repository, RabbitTemplate rabbitTemplate) {
        this.repository = repository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        UUID jobId = UUID.randomUUID();
        
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();

        String filePath = uploadDir + jobId + "_" + file.getOriginalFilename();
        file.transferTo(new File(filePath));

        ImageJob job = ImageJob.builder()
                .id(jobId)
                .fileName(file.getOriginalFilename())
                .filePath(filePath)
                .mimeType(file.getContentType())
                .status(ImageJob.Status.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        repository.save(job);

        // Publish event to RabbitMQ
        rabbitTemplate.convertAndSend(RabbitConfig.QUEUE_NAME, jobId.toString());

        return ResponseEntity.accepted().body(Map.of(
                "jobId", jobId,
                "status", "PENDING"
        ));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<?> getStatus(@PathVariable UUID id) {
        return repository.findById(id)
                .map(job -> ResponseEntity.ok(Map.of(
                        "jobId", job.getId(),
                        "status", job.getStatus(),
                        "failureReason", job.getFailureReason() != null ? job.getFailureReason() : ""
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<?> getResults(@PathVariable UUID id) {
        return repository.findById(id)
                .map(job -> ResponseEntity.ok(job))
                .orElse(ResponseEntity.notFound().build());
    }
}