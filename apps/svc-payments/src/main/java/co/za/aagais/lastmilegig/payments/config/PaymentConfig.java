package co.za.aagais.lastmilegig.payments.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Payment service configuration.
 *
 * @since 1.0.0
 */
@Configuration
public class PaymentConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
