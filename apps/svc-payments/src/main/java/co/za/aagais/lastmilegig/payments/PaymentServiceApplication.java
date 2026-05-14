package co.za.aagais.lastmilegig.payments;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Lastmile Gig Payment Service Application
 *
 * <p>Multi-gateway payment processing service supporting Paystack, Stripe,
 * Ozow, Peach Payments, and Flutterwave. Handles charge initiation,
 * webhook verification, driver payouts, and reconciliation.</p>
 *
 * @since 1.0.0
 * @see <a href="https://lastmilegig.aagais.co.za">Lastmile Gig Platform</a>
 */
@SpringBootApplication
@EnableScheduling
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
