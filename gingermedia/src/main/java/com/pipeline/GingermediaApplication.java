package com.pipeline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class GingermediaApplication {

	public static void main(String[] args) {
		SpringApplication.run(GingermediaApplication.class, args);
	}

}
