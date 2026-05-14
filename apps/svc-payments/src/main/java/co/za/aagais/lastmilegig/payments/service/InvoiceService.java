package co.za.aagais.lastmilegig.payments.service;

import co.za.aagais.lastmilegig.payments.model.PaymentEntity;
import co.za.aagais.lastmilegig.payments.model.PaymentStatus;
import co.za.aagais.lastmilegig.payments.repository.PaymentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Invoice generation service.
 *
 * <p>Generates PDF invoices for completed payments with Lastmile Gig branding.
 * Supports customer invoices, partner settlement statements, and driver
 * earnings summaries.</p>
 *
 * <p>Invoice types:
 * <ul>
 *   <li>CUSTOMER - Tax invoice for the paying customer</li>
 *   <li>PARTNER - Settlement statement for restaurant partner</li>
 *   <li>DRIVER - Earnings statement for delivery driver</li>
 * </ul>
 *
 * @since 1.0.0
 */
@Service
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);
    private static final ZoneId SAST = ZoneId.of("Africa/Johannesburg");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter
        .ofPattern("dd MMMM yyyy").withZone(SAST);
    private static final BigDecimal VAT_RATE = new BigDecimal("0.15");

    private final PaymentRepository paymentRepository;

    public InvoiceService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /**
     * Generate a customer invoice for a completed payment.
     *
     * @param paymentId UUID of the payment
     * @return InvoiceData containing all fields for PDF rendering
     */
    public InvoiceData generateCustomerInvoice(String paymentId) {
        PaymentEntity payment = paymentRepository.findById(UUID.fromString(paymentId))
            .orElseThrow(() -> new IllegalArgumentException(
                "Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.COMPLETED
                && payment.getStatus() != PaymentStatus.REFUNDED) {
            throw new IllegalStateException(
                "Cannot generate invoice for payment in status: " + payment.getStatus());
        }

        String invoiceNumber = generateInvoiceNumber(payment);
        BigDecimal vatExclusive = payment.getAmount()
            .divide(BigDecimal.ONE.add(VAT_RATE), 2, RoundingMode.HALF_UP);
        BigDecimal vatAmount = payment.getAmount().subtract(vatExclusive);

        return new InvoiceData(
            invoiceNumber,
            "CUSTOMER",
            payment.getOrderId(),
            payment.getCustomerName() != null ? payment.getCustomerName() : "Customer",
            payment.getCustomerEmail(),
            "Lastmile Gig (Pty) Ltd",
            "Registration: 2024/123456/07",
            "VAT: 4012345678",
            formatDate(payment.getCreatedAt()),
            formatDate(payment.getCompletedAt() != null ? payment.getCompletedAt() : payment.getCreatedAt()),
            payment.getCurrency(),
            vatExclusive,
            vatAmount,
            payment.getAmount(),
            payment.getGateway().getCode(),
            payment.getGatewayReference(),
            payment.getStatus().name()
        );
    }

    /**
     * Generate a partner settlement statement.
     *
     * @param partnerId UUID of the partner
     * @param startDate Start of the settlement period
     * @param endDate End of the settlement period
     * @return SettlementData for PDF rendering
     */
    public SettlementData generatePartnerSettlement(
            String partnerId, Instant startDate, Instant endDate) {
        BigDecimal totalRevenue = paymentRepository.sumCompletedAmountByPartner(
            partnerId, startDate, endDate
        );

        BigDecimal platformFee = totalRevenue.multiply(new BigDecimal("0.15"))
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal netSettlement = totalRevenue.subtract(platformFee)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatOnFee = platformFee.multiply(VAT_RATE)
            .setScale(2, RoundingMode.HALF_UP);

        long orderCount = paymentRepository.findCompletedInRange(
            PaymentStatus.COMPLETED, startDate, endDate
        ).stream()
            .filter(p -> partnerId.equals(p.getPartnerId()))
            .count();

        return new SettlementData(
            "LMG-SETTLE-" + partnerId.substring(0, 8) + "-" +
                formatDateShort(startDate),
            partnerId,
            formatDate(startDate),
            formatDate(endDate),
            (int) orderCount,
            totalRevenue,
            platformFee,
            vatOnFee,
            netSettlement,
            "ZAR",
            formatDate(Instant.now())
        );
    }

    /**
     * Generate a unique invoice number.
     */
    private String generateInvoiceNumber(PaymentEntity payment) {
        String datePrefix = DateTimeFormatter.ofPattern("yyyyMMdd")
            .withZone(SAST).format(payment.getCreatedAt());
        String shortId = payment.getId().toString().substring(0, 8).toUpperCase();
        return "LMG-INV-" + datePrefix + "-" + shortId;
    }

    private String formatDate(Instant instant) {
        return DATE_FORMAT.format(instant);
    }

    private String formatDateShort(Instant instant) {
        return DateTimeFormatter.ofPattern("yyyyMMdd").withZone(SAST).format(instant);
    }

    /**
     * Customer invoice data for PDF rendering.
     */
    public record InvoiceData(
        String invoiceNumber,
        String invoiceType,
        String orderId,
        String customerName,
        String customerEmail,
        String companyName,
        String companyRegistration,
        String companyVat,
        String invoiceDate,
        String paymentDate,
        String currency,
        BigDecimal subtotal,
        BigDecimal vatAmount,
        BigDecimal totalAmount,
        String paymentGateway,
        String transactionReference,
        String paymentStatus
    ) {}

    /**
     * Partner settlement statement data.
     */
    public record SettlementData(
        String settlementId,
        String partnerId,
        String periodStart,
        String periodEnd,
        int orderCount,
        BigDecimal grossRevenue,
        BigDecimal platformFee,
        BigDecimal vatOnFee,
        BigDecimal netSettlement,
        String currency,
        String generatedDate
    ) {}
}
