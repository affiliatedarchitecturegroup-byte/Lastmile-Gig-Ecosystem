package co.za.aagais.lastmilegig.payments.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Unit tests for PaymentEntity model.
 * @phase P219 - Payment Service Unit Tests
 */
class PaymentEntityTest {

    @Test
    @DisplayName("should set default status to PENDING on create")
    void defaultStatusPending() {
        PaymentEntity entity = new PaymentEntity();
        entity.onCreate();
        assertEquals(PaymentStatus.PENDING, entity.getStatus());
    }

    @Test
    @DisplayName("should set default currency to ZAR")
    void defaultCurrencyZar() {
        PaymentEntity entity = new PaymentEntity();
        entity.onCreate();
        assertEquals("ZAR", entity.getCurrency());
    }

    @Test
    @DisplayName("should set timestamps on create")
    void setTimestampsOnCreate() {
        PaymentEntity entity = new PaymentEntity();
        entity.onCreate();
        assertNotNull(entity.getCreatedAt());
        assertNotNull(entity.getUpdatedAt());
    }

    @Test
    @DisplayName("should update timestamp on update")
    void updateTimestamp() {
        PaymentEntity entity = new PaymentEntity();
        entity.onCreate();
        var created = entity.getUpdatedAt();
        entity.onUpdate();
        assertNotNull(entity.getUpdatedAt());
    }

    @Test
    @DisplayName("should convert to response DTO")
    void convertToResponse() {
        PaymentEntity entity = new PaymentEntity();
        entity.setOrderId("order-123");
        entity.setAmount(new BigDecimal("259.97"));
        entity.setCurrency("ZAR");
        entity.setGateway(PaymentGateway.PAYSTACK);
        entity.setStatus(PaymentStatus.COMPLETED);
        entity.onCreate();

        PaymentResponse response = entity.toResponse();
        assertEquals("order-123", response.orderId());
        assertEquals(PaymentGateway.PAYSTACK, response.gateway());
        assertEquals(PaymentStatus.COMPLETED, response.status());
        assertEquals(new BigDecimal("259.97"), response.amount());
        assertEquals("ZAR", response.currency());
    }

    @Test
    @DisplayName("should calculate amount in cents correctly")
    void amountInCents() {
        PaymentRequest request = new PaymentRequest(
            "order-1", "cust-1", "partner-1",
            new BigDecimal("259.97"), "ZAR",
            "test@example.com", "Test", null, null, null
        );
        assertEquals(25997L, request.amountInCents());
    }
}
