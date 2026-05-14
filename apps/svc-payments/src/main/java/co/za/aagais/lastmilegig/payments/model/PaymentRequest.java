package co.za.aagais.lastmilegig.payments.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Payment initiation request DTO.
 *
 * <p>Contains all information needed to initiate a payment charge
 * through any supported gateway. Amount is in ZAR cents for precision.</p>
 *
 * @since 1.0.0
 */
public record PaymentRequest(
    @NotBlank(message = "Order ID is required")
    String orderId,

    @NotBlank(message = "Customer ID is required")
    String customerId,

    @NotBlank(message = "Partner ID is required")
    String partnerId,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1.00", message = "Amount must be at least R1.00")
    BigDecimal amount,

    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be a 3-letter ISO code")
    String currency,

    @NotBlank(message = "Customer email is required")
    @Email(message = "Invalid email format")
    String customerEmail,

    String customerName,

    PaymentGateway preferredGateway,

    String callbackUrl,

    String metadata
) {
    /**
     * Convert amount to cents for gateway APIs that require integer amounts.
     */
    public long amountInCents() {
        return amount.multiply(BigDecimal.valueOf(100)).longValue();
    }
}
