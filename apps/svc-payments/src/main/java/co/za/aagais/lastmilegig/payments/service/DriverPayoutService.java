package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.gateway.OzowGateway;
import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/**
 * Driver payout processing service.
 *
 * <p>Handles commission calculation and driver payout after delivery
 * confirmation. Splits payment into platform fee, partner share, and
 * driver earnings. Uses Ozow instant EFT for driver payouts.</p>
 *
 * <p>Commission structure:
 * <ul>
 *   <li>Platform: 15% of order total</li>
 *   <li>Driver: 75% of delivery fee</li>
 *   <li>Partner: remaining after platform + driver</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Service
public class DriverPayoutService {

    private static final Logger log = LoggerFactory.getLogger(DriverPayoutService.class);

    private final PaymentRepository paymentRepository;
    private final OzowGateway ozowGateway;

    @Value("${lmg.commission.platform-rate:0.15}")
    private BigDecimal platformRate;

    @Value("${lmg.commission.driver-rate:0.75}")
    private BigDecimal driverRate;

    public DriverPayoutService(
            PaymentRepository paymentRepository,
            OzowGateway ozowGateway) {
        this.paymentRepository = paymentRepository;
        this.ozowGateway = ozowGateway;
    }

    /**
     * Process a delivery payout after order completion.
     *
     * <p>Steps:
     * <ol>
     *   <li>Find the completed payment for the order</li>
     *   <li>Calculate commission split</li>
     *   <li>Initiate Ozow payout to driver's bank account</li>
     *   <li>Update payment entity with payout status</li>
     * </ol>
     *
     * @param orderId Order that was delivered
     * @param driverId Driver who completed the delivery
     * @param partnerId Restaurant partner
     */
    @Transactional
    public void processDeliveryPayout(
            String orderId, String driverId, String partnerId) {
        log.info("Processing payout for order {}: driver={}", orderId, driverId);

        PaymentEntity payment = paymentRepository.findByOrderId(orderId)
            .orElseThrow(() -> new IllegalStateException(
                "No payment found for order: " + orderId));

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            log.warn("Cannot process payout - payment {} status is {}",
                payment.getId(), payment.getStatus());
            return;
        }

        if (payment.getPayoutStatus() != null
                && payment.getPayoutStatus() != PaymentStatus.PAYOUT_FAILED) {
            log.warn("Payout already initiated for payment {}: status={}",
                payment.getId(), payment.getPayoutStatus());
            return;
        }

        // Calculate commission split
        CommissionSplit split = calculateCommission(payment.getAmount());

        log.info("Commission split for order {}: platform={} driver={} partner={}",
            orderId, split.platformFee(), split.driverPayout(), split.partnerShare());

        // Initiate driver payout via Ozow
        try {
            payment.setPayoutStatus(PaymentStatus.PAYOUT_PENDING);
            paymentRepository.save(payment);

            // TODO: Look up driver bank details from svc-drivers
            // For now, using placeholder bank details
            String payoutRef = ozowGateway.initiatePayout(
                "placeholder-account",
                "placeholder-branch",
                split.driverPayout(),
                "LMG-PAYOUT-" + orderId
            );

            payment.setPayoutReference(payoutRef);
            payment.setPayoutAt(Instant.now());
            paymentRepository.save(payment);

            log.info("Driver payout initiated: order={} amount={} ref={}",
                orderId, split.driverPayout(), payoutRef);

        } catch (Exception e) {
            payment.setPayoutStatus(PaymentStatus.PAYOUT_FAILED);
            payment.setFailureReason("Payout failed: " + e.getMessage());
            paymentRepository.save(payment);

            log.error("Driver payout failed for order {}", orderId, e);
            // TODO: Publish to retry queue / alert ops team
        }
    }

    /**
     * Calculate the commission split for a payment.
     *
     * @param totalAmount Total payment amount
     * @return Commission split with platform fee, driver payout, and partner share
     */
    public CommissionSplit calculateCommission(BigDecimal totalAmount) {
        BigDecimal platformFee = totalAmount.multiply(platformRate)
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal deliveryFee = totalAmount.multiply(new BigDecimal("0.10"))
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal driverPayout = deliveryFee.multiply(driverRate)
            .setScale(2, RoundingMode.HALF_UP);

        BigDecimal partnerShare = totalAmount
            .subtract(platformFee)
            .subtract(driverPayout)
            .setScale(2, RoundingMode.HALF_UP);

        return new CommissionSplit(platformFee, driverPayout, partnerShare, deliveryFee);
    }

    /**
     * Commission split breakdown.
     */
    public record CommissionSplit(
        BigDecimal platformFee,
        BigDecimal driverPayout,
        BigDecimal partnerShare,
        BigDecimal deliveryFee
    ) {}
}
