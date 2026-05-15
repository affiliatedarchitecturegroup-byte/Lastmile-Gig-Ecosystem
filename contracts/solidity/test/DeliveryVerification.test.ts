/**
 * DeliveryVerification Contract Tests
 *
 * Comprehensive test suite covering:
 * - Delivery recording (happy path and error cases)
 * - Dispute filing and resolution
 * - Access control (role enforcement)
 * - Pausable functionality
 * - View function correctness
 *
 * Coverage target: >= 95%
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.1
 */

import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployDeliveryVerificationFixture } from './helpers/fixtures';
import {
  ORDER_ID_1,
  ORDER_ID_2,
  DRIVER_ID_1,
  DRIVER_ID_2,
  CUSTOMER_ID_1,
  LAT_DURBAN,
  LNG_DURBAN,
  LAT_INVALID,
  LNG_INVALID,
  PHOTO_HASH_1,
  PHOTO_HASH_2,
  SIGNATURE_HASH_1,
  ZERO_BYTES32,
} from './helpers/constants';

describe('DeliveryVerification', function () {
  describe('Deployment', function () {
    it('should deploy with correct admin role', async function () {
      const { contract, admin } = await loadFixture(deployDeliveryVerificationFixture);
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('should have zero deliveries initially', async function () {
      const { contract } = await loadFixture(deployDeliveryVerificationFixture);
      const [total, disputed] = await contract.getStats();
      expect(total).to.equal(0n);
      expect(disputed).to.equal(0n);
    });
  });

  describe('recordDelivery', function () {
    it('should record a delivery successfully', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      )
        .to.emit(contract, 'DeliveryRecorded')
        .withArgs(ORDER_ID_1, DRIVER_ID_1, CUSTOMER_ID_1, () => true, PHOTO_HASH_1);
    });

    it('should store the correct delivery record data', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      const record = await contract.getDeliveryRecord(ORDER_ID_1);
      expect(record.orderId).to.equal(ORDER_ID_1);
      expect(record.driverId).to.equal(DRIVER_ID_1);
      expect(record.customerId).to.equal(CUSTOMER_ID_1);
      expect(record.deliveryLat).to.equal(LAT_DURBAN);
      expect(record.deliveryLng).to.equal(LNG_DURBAN);
      expect(record.photoHash).to.equal(PHOTO_HASH_1);
      expect(record.signatureHash).to.equal(SIGNATURE_HASH_1);
      expect(record.verified).to.be.true;
      expect(record.disputed).to.be.false;
    });

    it('should increment total deliveries counter', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      const [total] = await contract.getStats();
      expect(total).to.equal(1n);
    });

    it('should revert for duplicate order ID', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_2,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_2,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'DeliveryAlreadyRecorded');
    });

    it('should revert for empty order ID', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ZERO_BYTES32,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'EmptyOrderId');
    });

    it('should revert for empty driver ID', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            ZERO_BYTES32,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'EmptyDriverId');
    });

    it('should revert for empty photo hash', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            ZERO_BYTES32,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'EmptyPhotoHash');
    });

    it('should revert for invalid latitude', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_INVALID,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'InvalidCoordinates');
    });

    it('should revert for invalid longitude', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_INVALID,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'InvalidCoordinates');
    });

    it('should revert for unauthorized caller', async function () {
      const { contract, unauthorized } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract
          .connect(unauthorized)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.reverted;
    });
  });

  describe('disputeDelivery', function () {
    it('should flag a delivery as disputed', async function () {
      const { contract, recorder, verifier } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      await expect(contract.connect(verifier).disputeDelivery(ORDER_ID_1))
        .to.emit(contract, 'DeliveryDisputed')
        .withArgs(ORDER_ID_1, verifier.address, () => true);

      const [, disputed] = await contract.getStats();
      expect(disputed).to.equal(1n);
    });

    it('should revert for non-existent delivery', async function () {
      const { contract, verifier } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(
        contract.connect(verifier).disputeDelivery(ORDER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'DeliveryNotFound');
    });
  });

  describe('resolveDispute', function () {
    it('should resolve a dispute as verified', async function () {
      const { contract, recorder, verifier } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      await contract.connect(verifier).disputeDelivery(ORDER_ID_1);
      await contract.connect(verifier).resolveDispute(ORDER_ID_1, true);

      const record = await contract.getDeliveryRecord(ORDER_ID_1);
      expect(record.verified).to.be.true;
      expect(record.disputed).to.be.false;
    });

    it('should resolve a dispute as not verified', async function () {
      const { contract, recorder, verifier } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      await contract.connect(verifier).disputeDelivery(ORDER_ID_1);
      await contract.connect(verifier).resolveDispute(ORDER_ID_1, false);

      const record = await contract.getDeliveryRecord(ORDER_ID_1);
      expect(record.verified).to.be.false;
    });

    it('should revert if not disputed', async function () {
      const { contract, recorder, verifier } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      await expect(
        contract.connect(verifier).resolveDispute(ORDER_ID_1, true),
      ).to.be.revertedWithCustomError(contract, 'DeliveryNotDisputed');
    });
  });

  describe('verifyDelivery', function () {
    it('should return correct verification data', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      const [verified, timestamp, photoHash] = await contract.verifyDelivery(ORDER_ID_1);
      expect(verified).to.be.true;
      expect(timestamp).to.be.gt(0n);
      expect(photoHash).to.equal(PHOTO_HASH_1);
    });

    it('should revert for non-existent order', async function () {
      const { contract } = await loadFixture(deployDeliveryVerificationFixture);

      await expect(contract.verifyDelivery(ORDER_ID_1)).to.be.revertedWithCustomError(
        contract,
        'DeliveryNotFound',
      );
    });
  });

  describe('Pausable', function () {
    it('should prevent recording when paused', async function () {
      const { contract, recorder, pauser } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract.connect(pauser).pause();

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).to.be.reverted;
    });

    it('should allow recording after unpause', async function () {
      const { contract, recorder, pauser } = await loadFixture(
        deployDeliveryVerificationFixture,
      );

      await contract.connect(pauser).pause();
      await contract.connect(pauser).unpause();

      await expect(
        contract
          .connect(recorder)
          .recordDelivery(
            ORDER_ID_1,
            DRIVER_ID_1,
            CUSTOMER_ID_1,
            LAT_DURBAN,
            LNG_DURBAN,
            PHOTO_HASH_1,
            SIGNATURE_HASH_1,
          ),
      ).not.to.be.reverted;
    });
  });

  describe('deliveryExists', function () {
    it('should return false for non-existent delivery', async function () {
      const { contract } = await loadFixture(deployDeliveryVerificationFixture);
      expect(await contract.deliveryExists(ORDER_ID_1)).to.be.false;
    });

    it('should return true for existing delivery', async function () {
      const { contract, recorder } = await loadFixture(deployDeliveryVerificationFixture);

      await contract
        .connect(recorder)
        .recordDelivery(
          ORDER_ID_1,
          DRIVER_ID_1,
          CUSTOMER_ID_1,
          LAT_DURBAN,
          LNG_DURBAN,
          PHOTO_HASH_1,
          SIGNATURE_HASH_1,
        );

      expect(await contract.deliveryExists(ORDER_ID_1)).to.be.true;
    });
  });
});
