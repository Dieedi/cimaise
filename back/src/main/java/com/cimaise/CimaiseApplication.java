package com.cimaise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Cimaise server.
 *
 * @SpringBootApplication combines 3 annotations:
 * - @Configuration: this class can define beans (objects managed by Spring)
 * - @EnableAutoConfiguration: Spring configures itself based on the dependencies in pom.xml
 * - @ComponentScan: Spring scans com.cimaise.* for @Service, @Controller, @Repository etc.
 *
 * @EnableScheduling: activates @Scheduled methods (used for session cleanup timer)
 */
@SpringBootApplication
@EnableScheduling
public class CimaiseApplication {
    public static void main(String[] args) {
        SpringApplication.run(CimaiseApplication.class, args);
    }
}
