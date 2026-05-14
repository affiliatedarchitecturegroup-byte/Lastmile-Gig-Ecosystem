package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.service.DriverPayoutService.CommissionSplit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for DriverPayoutService commission calculations.
 * @phase P219 - Payment Service Unit Tests
 */
class DriverPayoutServiceTest {

    private DriverPayoutService payoutService;

    @BeforeEach
    void setUp() {
        // Create service with null dependencies (only testing commission calc)
        payoutService = new DriverPayoutService(null, null);
    }

    @Nested
    @DisplayName("Commission Calculation")
    class CommissionCalculation {

        @Test
        @DisplayName("should calculate correct platform fee (15%)")
        void correctPlatformFee() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("100.00")
            );
            assertEquals(new BigDecimal("15.00"), split.platformFee());
        }

        @Test
        @DisplayName("should calculate correct driver payout (75% of delivery fee)")
        void correctDriverPayout() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("100.00")
            );
            // Delivery fee = 10% of 100 = R10
            // Driver = 75% of R10 = R7.50
            assertEquals(new BigDecimal("7.50"), split.driverPayout());
        }

        @Test
        @DisplayName("should calculate correct partner share")
        void correctPartnerShare() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("100.00")
            );
            // Partner = 100 - 15 (platform) - 7.50 (driver) = R77.50
            assertEquals(new BigDecimal("77.50"), split.partnerShare());
        }

        @Test
        @DisplayName("should sum to total amount")
        void sumToTotal() {
            BigDecimal total = new BigDecimal("259.97");
            CommissionSplit split = payoutService.calculateCommission(total);

            BigDecimal sum = split.platformFee()
                .add(split.driverPayout())
                .add(split.partnerShare());
            assertEquals(0, total.compareTo(sum),
                "Platform + driver + partner should equal total");
        }

        @Test
        @DisplayName("should handle large amounts correctly")
        void handleLargeAmounts() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("50000.00")
            );
            assertEquals(new BigDecimal("7500.00"), split.platformFee());
            assertTrue(split.driverPayout().compareTo(BigDecimal.ZERO) > 0);
            assertTrue(split.partnerShare().compareTo(BigDecimal.ZERO) > 0);
        }

        @Test
        @DisplayName("should handle minimum order amount")
        void handleMinimumAmount() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("1.00")
            );
            assertTrue(split.platformFee().compareTo(BigDecimal.ZERO) > 0);
            assertTrue(split.driverPayout().compareTo(BigDecimal.ZERO) >= 0);
        }

        @Test
        @DisplayName("should have all positive values")
        void allPositiveValues() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("350.00")
            );
            assertTrue(split.platformFee().compareTo(BigDecimal.ZERO) > 0);
            assertTrue(split.driverPayout().compareTo(BigDecimal.ZERO) > 0);
            assertTrue(split.partnerShare().compareTo(BigDecimal.ZERO) > 0);
            assertTrue(split.deliveryFee().compareTo(BigDecimal.ZERO) > 0);
        }

        @Test
        @DisplayName("should calculate delivery fee as 10% of total")
        void correctDeliveryFee() {
            CommissionSplit split = payoutService.calculateCommission(
                new BigDecimal("200.00")
            );
            assertEquals(new BigDecimal("20.00"), split.deliveryFee());
        }
    }
}
