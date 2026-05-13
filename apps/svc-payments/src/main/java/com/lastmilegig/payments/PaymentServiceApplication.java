/**
 * Payment Service - Spring Boot Application Entry Point.
 *
 * Unified payment abstraction layer across all gateways:
 * Paystack, Stripe, Ozow, Peach Payments, Flutterwave.
 * Smart contract payout execution via Polygon CDK.
 *
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 2.12
 * @see docs/specs/11_PAYMENTS_FINANCIAL.md
 * @port 6000
 */
package com.lastmilegig.payments;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
