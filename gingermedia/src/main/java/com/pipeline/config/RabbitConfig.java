package com.pipeline.config;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    public static final String QUEUE_NAME = "image_processing_queue";

    @Bean
    public Queue imageQueue() {
        return new Queue(QUEUE_NAME, true);
    }
}