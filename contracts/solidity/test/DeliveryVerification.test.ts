/**
 * DeliveryVerification Smart Contract - Unit Tests
 *
 * Tests delivery recording, verification, and access control.
 * Coverage target: 95%+.
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { DeliveryVerification } from '../typechain-types';

describe('DeliveryVerification', () => {
  let contract: DeliveryVerification;
  let admin: any;
  let other: any;

  const orderHash = ethers.keccak256(ethers.toUtf8Bytes('order-001'));
  const driverHash = ethers.keccak256(ethers.toUtf8Bytes('driver-001'));
  const photoHash = ethers.keccak256(ethers.toUtf8Bytes('photo-hash-abc'));
  const latitude = -29858700; // -29.8587 * 1e6
  const longitude = 31021800; // 31.0218 * 1e6

  beforeEach(async () => {
    [admin, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('DeliveryVerification');
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe('recordDelivery', () => {
    it('should record a delivery successfully', async () => {
      await expect(
        contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude),
      )
        .to.emit(contract, 'DeliveryRecorded')
        .withArgs(orderHash, driverHash, photoHash, await getBlockTimestamp());
    });

    it('should store delivery data correctly', async () => {
      await contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude);
      const delivery = await contract.deliveries(orderHash);

      expect(delivery.orderHash).to.equal(orderHash);
      expect(delivery.driverHash).to.equal(driverHash);
      expect(delivery.photoHash).to.equal(photoHash);
      expect(delivery.verified).to.be.false;
    });

    it('should reject duplicate delivery recording', async () => {
      await contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude);
      await expect(
        contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude),
      ).to.be.revertedWith('DeliveryVerification: delivery already recorded');
    });

    it('should reject non-admin caller', async () => {
      await expect(
        contract.connect(other).recordDelivery(orderHash, driverHash, photoHash, latitude, longitude),
      ).to.be.revertedWith('DeliveryVerification: caller is not admin');
    });

    it('should increment delivery count', async () => {
      expect(await contract.getDeliveryCount()).to.equal(0);
      await contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude);
      expect(await contract.getDeliveryCount()).to.equal(1);
    });
  });

  describe('verifyDelivery', () => {
    beforeEach(async () => {
      await contract.recordDelivery(orderHash, driverHash, photoHash, latitude, longitude);
    });

    it('should verify a recorded delivery', async () => {
      await expect(contract.verifyDelivery(orderHash))
        .to.emit(contract, 'DeliveryVerified');

      expect(await contract.isDeliveryVerified(orderHash)).to.be.true;
    });

    it('should reject verification of non-existent delivery', async () => {
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes('fake'));
      await expect(contract.verifyDelivery(fakeHash))
        .to.be.revertedWith('DeliveryVerification: delivery not found');
    });

    it('should reject double verification', async () => {
      await contract.verifyDelivery(orderHash);
      await expect(contract.verifyDelivery(orderHash))
        .to.be.revertedWith('DeliveryVerification: already verified');
    });
  });

  describe('transferAdmin', () => {
    it('should transfer admin role', async () => {
      await contract.transferAdmin(other.address);
      expect(await contract.admin()).to.equal(other.address);
    });

    it('should reject zero address', async () => {
      await expect(contract.transferAdmin(ethers.ZeroAddress))
        .to.be.revertedWith('DeliveryVerification: zero address');
    });
  });
});

async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock('latest');
  return block?.timestamp ?? 0;
}
