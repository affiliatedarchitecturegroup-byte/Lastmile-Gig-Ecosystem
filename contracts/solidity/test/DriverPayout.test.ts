/**
 * DriverPayout Smart Contract - Unit Tests
 *
 * Tests escrow, payout release, refund, and commission logic.
 * Coverage target: 95%+.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { DriverPayout } from '../typechain-types';

describe('DriverPayout', () => {
  let contract: DriverPayout;
  let admin: any;
  let treasury: any;
  let driver: any;
  let customer: any;

  const orderHash = ethers.keccak256(ethers.toUtf8Bytes('order-001'));
  const driverHash = ethers.keccak256(ethers.toUtf8Bytes('driver-001'));
  const escrowAmount = ethers.parseEther('1.0');

  beforeEach(async () => {
    [admin, treasury, driver, customer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('DriverPayout');
    contract = await Factory.deploy(treasury.address);
    await contract.waitForDeployment();
  });

  describe('escrowFunds', () => {
    it('should escrow funds with correct commission split', async () => {
      await expect(
        contract.escrowFunds(orderHash, driverHash, { value: escrowAmount }),
      ).to.emit(contract, 'FundsEscrowed');

      const payout = await contract.payouts(orderHash);
      expect(payout.totalAmount).to.equal(escrowAmount);

      // 15% commission = 0.15 ETH
      const expectedCommission = escrowAmount * 1500n / 10000n;
      const expectedDriver = escrowAmount - expectedCommission;
      expect(payout.commissionAmount).to.equal(expectedCommission);
      expect(payout.driverAmount).to.equal(expectedDriver);
      expect(payout.status).to.equal(0); // ESCROWED
    });

    it('should reject zero value escrow', async () => {
      await expect(
        contract.escrowFunds(orderHash, driverHash, { value: 0 }),
      ).to.be.revertedWith('DriverPayout: zero value');
    });

    it('should reject duplicate escrow', async () => {
      await contract.escrowFunds(orderHash, driverHash, { value: escrowAmount });
      await expect(
        contract.escrowFunds(orderHash, driverHash, { value: escrowAmount }),
      ).to.be.revertedWith('DriverPayout: already escrowed');
    });
  });

  describe('releasePayout', () => {
    beforeEach(async () => {
      await contract.escrowFunds(orderHash, driverHash, { value: escrowAmount });
    });

    it('should release payout to driver and commission to treasury', async () => {
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);
      const driverBefore = await ethers.provider.getBalance(driver.address);

      await contract.releasePayout(orderHash, driver.address);

      const payout = await contract.payouts(orderHash);
      expect(payout.status).to.equal(1); // RELEASED

      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      const driverAfter = await ethers.provider.getBalance(driver.address);

      expect(treasuryAfter - treasuryBefore).to.equal(payout.commissionAmount);
      expect(driverAfter - driverBefore).to.equal(payout.driverAmount);
    });
  });

  describe('refundEscrow', () => {
    beforeEach(async () => {
      await contract.escrowFunds(orderHash, driverHash, { value: escrowAmount });
    });

    it('should refund full escrowed amount', async () => {
      const customerBefore = await ethers.provider.getBalance(customer.address);
      await contract.refundEscrow(orderHash, customer.address);

      const payout = await contract.payouts(orderHash);
      expect(payout.status).to.equal(2); // REFUNDED

      const customerAfter = await ethers.provider.getBalance(customer.address);
      expect(customerAfter - customerBefore).to.equal(escrowAmount);
    });
  });

  describe('setCommissionBps', () => {
    it('should update commission rate', async () => {
      await contract.setCommissionBps(2000); // 20%
      expect(await contract.commissionBps()).to.equal(2000);
    });

    it('should reject commission above 50%', async () => {
      await expect(contract.setCommissionBps(5001))
        .to.be.revertedWith('DriverPayout: commission too high');
    });
  });
});
