package com.example.urbanserve.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Only needed when the React build is served from a different origin than the API
 * (in dev, Vite's proxy makes this unnecessary).
 * Copy to src/main/java/com/example/urbanserve/config/ and set app.cors.origins.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Value("${app.cors.origins:http://localhost:5173}")
    private String[] origins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PATCH", "OPTIONS");
    }
}
