/**
 * DriverPayout Contract Tests
 *
 * Comprehensive test suite covering:
 * - Escrow creation (happy path and error cases)
 * - Payout release after hold period
 * - Refund flow
 * - Hold period management
 * - Access control
 * - Pausable functionality
 *
 * Coverage target: >= 95%
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.2
 */

import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployDriverPayoutFixture } from './helpers/fixtures';
import {
  ORDER_ID_1,
  ORDER_ID_2,
  ESCROW_AMOUNT_1,
  ESCROW_AMOUNT_2,
  ZERO_ADDRESS,
  ZERO_BYTES32,
  TEN_MINUTES,
  ONE_HOUR,
  ONE_DAY,
} from './helpers/constants';

describe('DriverPayout', function () {
  describe('Deployment', function () {
    it('should deploy with correct hold period', async function () {
      const { contract } = await loadFixture(deployDriverPayoutFixture);
      expect(await contract.getHoldPeriod()).to.equal(TEN_MINUTES);
    });

    it('should have zero stats initially', async function () {
      const { contract } = await loadFixture(deployDriverPayoutFixture);
      const stats = await contract.getStats();
      expect(stats.totalCreated).to.equal(0n);
      expect(stats.totalReleased).to.equal(0n);
      expect(stats.amountReleased).to.equal(0n);
      expect(stats.amountRefunded).to.equal(0n);
    });
  });

  describe('createEscrow', function () {
    it('should create an escrow successfully', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await expect(
        contract
          .connect(paymentService)
          .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_1,
          }),
      )
        .to.emit(contract, 'EscrowCreated')
        .withArgs(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, () => true);
    });

    it('should store correct escrow data', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      const escrow = await contract.getEscrow(ORDER_ID_1);
      expect(escrow.driverWallet).to.equal(driverWallet.address);
      expect(escrow.amount).to.equal(ESCROW_AMOUNT_1);
      expect(escrow.orderId).to.equal(ORDER_ID_1);
      expect(escrow.status).to.equal(0); // CREATED
    });

    it('should revert for duplicate escrow', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await expect(
        contract
          .connect(paymentService)
          .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_1,
          }),
      ).to.be.revertedWithCustomError(contract, 'EscrowAlreadyExists');
    });

    it('should revert for zero address driver wallet', async function () {
      const { contract, paymentService } = await loadFixture(deployDriverPayoutFixture);

      await expect(
        contract
          .connect(paymentService)
          .createEscrow(ORDER_ID_1, ZERO_ADDRESS, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_1,
          }),
      ).to.be.revertedWithCustomError(contract, 'InvalidDriverWallet');
    });

    it('should revert for zero amount', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await expect(
        contract.connect(paymentService).createEscrow(ORDER_ID_1, driverWallet.address, 0, {
          value: 0,
        }),
      ).to.be.revertedWithCustomError(contract, 'InvalidAmount');
    });

    it('should revert for amount mismatch', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await expect(
        contract
          .connect(paymentService)
          .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_2,
          }),
      ).to.be.revertedWithCustomError(contract, 'AmountMismatch');
    });

    it('should revert for unauthorized caller', async function () {
      const { contract, unauthorized, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await expect(
        contract
          .connect(unauthorized)
          .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_1,
          }),
      ).to.be.reverted;
    });
  });

  describe('releasePayout', function () {
    it('should release payout after hold period', async function () {
      const { contract, paymentService, releaser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await time.increase(TEN_MINUTES + 1);

      const balanceBefore = await driverWallet.provider.getBalance(driverWallet.address);

      await expect(contract.connect(releaser).releasePayout(ORDER_ID_1))
        .to.emit(contract, 'PayoutReleased')
        .withArgs(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, () => true);

      const balanceAfter = await driverWallet.provider.getBalance(driverWallet.address);
      expect(balanceAfter - balanceBefore).to.equal(ESCROW_AMOUNT_1);
    });

    it('should revert during hold period', async function () {
      const { contract, paymentService, releaser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await expect(
        contract.connect(releaser).releasePayout(ORDER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'HoldPeriodActive');
    });

    it('should revert for non-existent escrow', async function () {
      const { contract, releaser } = await loadFixture(deployDriverPayoutFixture);

      await expect(
        contract.connect(releaser).releasePayout(ORDER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'EscrowNotFound');
    });

    it('should revert for already released escrow', async function () {
      const { contract, paymentService, releaser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await time.increase(TEN_MINUTES + 1);
      await contract.connect(releaser).releasePayout(ORDER_ID_1);

      await expect(
        contract.connect(releaser).releasePayout(ORDER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'EscrowAlreadyCompleted');
    });

    it('should update driver earnings after release', async function () {
      const { contract, paymentService, releaser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await time.increase(TEN_MINUTES + 1);
      await contract.connect(releaser).releasePayout(ORDER_ID_1);

      expect(await contract.getDriverEarnings(driverWallet.address)).to.equal(ESCROW_AMOUNT_1);
    });

    it('should update platform stats after release', async function () {
      const { contract, paymentService, releaser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await time.increase(TEN_MINUTES + 1);
      await contract.connect(releaser).releasePayout(ORDER_ID_1);

      const stats = await contract.getStats();
      expect(stats.totalCreated).to.equal(1n);
      expect(stats.totalReleased).to.equal(1n);
      expect(stats.amountReleased).to.equal(ESCROW_AMOUNT_1);
    });
  });

  describe('refundEscrow', function () {
    it('should refund an escrow successfully', async function () {
      const { contract, paymentService, refunder, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await expect(
        contract.connect(refunder).refundEscrow(ORDER_ID_1, 'Customer dispute'),
      )
        .to.emit(contract, 'PayoutRefunded')
        .withArgs(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, 'Customer dispute');
    });

    it('should revert for already released escrow', async function () {
      const { contract, paymentService, releaser, refunder, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      await time.increase(TEN_MINUTES + 1);
      await contract.connect(releaser).releasePayout(ORDER_ID_1);

      await expect(
        contract.connect(refunder).refundEscrow(ORDER_ID_1, 'Too late'),
      ).to.be.revertedWithCustomError(contract, 'EscrowAlreadyCompleted');
    });
  });

  describe('setHoldPeriod', function () {
    it('should update hold period', async function () {
      const { contract, admin } = await loadFixture(deployDriverPayoutFixture);

      await expect(contract.connect(admin).setHoldPeriod(ONE_HOUR))
        .to.emit(contract, 'HoldPeriodUpdated')
        .withArgs(TEN_MINUTES, ONE_HOUR);

      expect(await contract.getHoldPeriod()).to.equal(ONE_HOUR);
    });

    it('should revert for period below minimum', async function () {
      const { contract, admin } = await loadFixture(deployDriverPayoutFixture);

      await expect(contract.connect(admin).setHoldPeriod(60)).to.be.revertedWithCustomError(
        contract,
        'InvalidHoldPeriod',
      );
    });

    it('should revert for period above maximum', async function () {
      const { contract, admin } = await loadFixture(deployDriverPayoutFixture);

      await expect(
        contract.connect(admin).setHoldPeriod(ONE_DAY + ONE_HOUR),
      ).to.be.revertedWithCustomError(contract, 'InvalidHoldPeriod');
    });
  });

  describe('Pausable', function () {
    it('should prevent escrow creation when paused', async function () {
      const { contract, paymentService, pauser, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract.connect(pauser).pause();

      await expect(
        contract
          .connect(paymentService)
          .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
            value: ESCROW_AMOUNT_1,
          }),
      ).to.be.reverted;
    });
  });

  describe('escrowExists', function () {
    it('should return false for non-existent escrow', async function () {
      const { contract } = await loadFixture(deployDriverPayoutFixture);
      expect(await contract.escrowExists(ORDER_ID_1)).to.be.false;
    });

    it('should return true for existing escrow', async function () {
      const { contract, paymentService, driverWallet } = await loadFixture(
        deployDriverPayoutFixture,
      );

      await contract
        .connect(paymentService)
        .createEscrow(ORDER_ID_1, driverWallet.address, ESCROW_AMOUNT_1, {
          value: ESCROW_AMOUNT_1,
        });

      expect(await contract.escrowExists(ORDER_ID_1)).to.be.true;
    });
  });
});
