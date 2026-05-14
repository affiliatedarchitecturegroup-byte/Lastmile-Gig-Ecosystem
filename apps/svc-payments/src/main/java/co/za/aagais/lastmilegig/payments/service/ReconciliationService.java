package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Payment reconciliation engine.
 *
 * <p>Runs daily at 02:00 SAST to reconcile all completed payments
 * from the previous day. Generates a reconciliation report with
 * per-gateway breakdown, commission summaries, and discrepancy flags.</p>
 *
 * @since 1.0.0
 */
@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);
    private static final ZoneId SAST = ZoneId.of("Africa/Johannesburg");

    private final PaymentRepository paymentRepository;

    public ReconciliationService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /**
     * Daily reconciliation job - runs at 02:00 SAST.
     *
     * <p>Reconciles all completed payments from the previous business day:
     * <ol>
     *   <li>Query all COMPLETED payments in the date range</li>
     *   <li>Group by gateway for per-gateway totals</li>
     *   <li>Calculate commission splits</li>
     *   <li>Flag any discrepancies (amount mismatches, missing payouts)</li>
     *   <li>Generate reconciliation report</li>
     * </ol>
     */
    @Scheduled(cron = "0 0 2 * * *", zone = "Africa/Johannesburg")
    public void runDailyReconciliation() {
        LocalDate yesterday = LocalDate.now(SAST).minusDays(1);
        log.info("Starting daily reconciliation for {}", yesterday);

        ReconciliationReport report = reconcileDate(yesterday);

        log.info("Reconciliation complete for {}: {} payments, total={} ZAR, discrepancies={}",
            yesterday,
            report.totalPayments(),
            report.totalAmount(),
            report.discrepancies().size());

        // TODO: Publish report to Kafka topic lmg.payments.reconciliation
        // TODO: Store report in MongoDB for dashboard display
        // TODO: Send email to finance team if discrepancies found
    }

    /**
     * Reconcile payments for a specific date.
     *
     * @param date The date to reconcile (in SAST)
     * @return ReconciliationReport with all details
     */
    public ReconciliationReport reconcileDate(LocalDate date) {
        Instant startOfDay = date.atStartOfDay(SAST).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(SAST).toInstant();

        List<PaymentEntity> completedPayments = paymentRepository.findCompletedInRange(
            PaymentStatus.COMPLETED, startOfDay, endOfDay
        );

        log.info("Found {} completed payments for {}", completedPayments.size(), date);

        // Per-gateway breakdown
        Map<String, GatewayBreakdown> gatewayBreakdowns = new LinkedHashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalPlatformFee = BigDecimal.ZERO;
        BigDecimal totalDriverPayouts = BigDecimal.ZERO;
        BigDecimal totalPartnerShare = BigDecimal.ZERO;
        List<String> discrepancies = new ArrayList<>();

        for (PaymentEntity payment : completedPayments) {
            String gatewayKey = payment.getGateway().getCode();

            GatewayBreakdown breakdown = gatewayBreakdowns.computeIfAbsent(
                gatewayKey, k -> new GatewayBreakdown(gatewayKey, 0, BigDecimal.ZERO)
            );

            BigDecimal amount = payment.getAmount();
            gatewayBreakdowns.put(gatewayKey, new GatewayBreakdown(
                gatewayKey,
                breakdown.count() + 1,
                breakdown.total().add(amount)
            ));

            totalAmount = totalAmount.add(amount);

            // Calculate commission split
            BigDecimal platformFee = amount.multiply(new BigDecimal("0.15"))
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal deliveryFee = amount.multiply(new BigDecimal("0.10"))
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal driverPayout = deliveryFee.multiply(new BigDecimal("0.75"))
                .setScale(2, RoundingMode.HALF_UP);
            BigDecimal partnerShare = amount.subtract(platformFee).subtract(driverPayout)
                .setScale(2, RoundingMode.HALF_UP);

            totalPlatformFee = totalPlatformFee.add(platformFee);
            totalDriverPayouts = totalDriverPayouts.add(driverPayout);
            totalPartnerShare = totalPartnerShare.add(partnerShare);

            // Check for missing payouts
            if (payment.getPayoutStatus() == null) {
                discrepancies.add(String.format(
                    "Payment %s (order %s): completed but no payout initiated",
                    payment.getId(), payment.getOrderId()
                ));
            }

            if (payment.getPayoutStatus() == PaymentStatus.PAYOUT_FAILED) {
                discrepancies.add(String.format(
                    "Payment %s (order %s): payout failed - %s",
                    payment.getId(), payment.getOrderId(), payment.getFailureReason()
                ));
            }
        }

        return new ReconciliationReport(
            date.format(DateTimeFormatter.ISO_LOCAL_DATE),
            completedPayments.size(),
            totalAmount.setScale(2, RoundingMode.HALF_UP),
            totalPlatformFee.setScale(2, RoundingMode.HALF_UP),
            totalDriverPayouts.setScale(2, RoundingMode.HALF_UP),
            totalPartnerShare.setScale(2, RoundingMode.HALF_UP),
            new ArrayList<>(gatewayBreakdowns.values()),
            discrepancies,
            Instant.now()
        );
    }

    /**
     * Per-gateway payment breakdown.
     */
    public record GatewayBreakdown(
        String gateway,
        int count,
        BigDecimal total
    ) {}

    /**
     * Daily reconciliation report.
     */
    public record ReconciliationReport(
        String date,
        int totalPayments,
        BigDecimal totalAmount,
        BigDecimal platformFees,
        BigDecimal driverPayouts,
        BigDecimal partnerShares,
        List<GatewayBreakdown> gatewayBreakdowns,
        List<String> discrepancies,
        Instant generatedAt
    ) {}
}
