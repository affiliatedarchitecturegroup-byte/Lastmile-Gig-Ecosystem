/**
 * PartnerSLA Contract Tests
 *
 * Comprehensive test suite covering:
 * - SLA contract creation and management
 * - Breach and success recording
 * - Weekly settlement execution
 * - Contract status updates
 * - Access control and pausability
 *
 * Coverage target: >= 95%
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.3
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployPartnerSLAFixture } from './helpers/fixtures';
import { CONTRACT_ID_1, CONTRACT_ID_2, ORDER_ID_1, ORDER_ID_2, ZERO_ADDRESS } from './helpers/constants';

const TARGET_45_MIN = 45;
const PENALTY_WEI = ethers.parseEther('0.001');
const BONUS_WEI = ethers.parseEther('0.01');

describe('PartnerSLA', function () {
  describe('Deployment', function () {
    it('should deploy with correct admin role', async function () {
      const { contract, admin } = await loadFixture(deployPartnerSLAFixture);
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('should have zero active contracts initially', async function () {
      const { contract } = await loadFixture(deployPartnerSLAFixture);
      expect(await contract.getActiveContractCount()).to.equal(0n);
    });
  });

  describe('createContract', function () {
    it('should create an SLA contract successfully', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI),
      )
        .to.emit(contract, 'SLAContractCreated')
        .withArgs(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);
    });

    it('should store correct contract data', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      const sla = await contract.getContract(CONTRACT_ID_1);
      expect(sla.partnerAddress).to.equal(partner.address);
      expect(sla.deliveryTargetMinutes).to.equal(TARGET_45_MIN);
      expect(sla.penaltyPerBreachWei).to.equal(PENALTY_WEI);
      expect(sla.bonusPerPerfectWeek).to.equal(BONUS_WEI);
      expect(sla.status).to.equal(0); // ACTIVE
    });

    it('should increment active contract count', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      expect(await contract.getActiveContractCount()).to.equal(1n);
    });

    it('should revert for duplicate contract ID', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI),
      ).to.be.revertedWithCustomError(contract, 'ContractAlreadyExists');
    });

    it('should revert for zero partner address', async function () {
      const { contract, slaManager } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, ZERO_ADDRESS, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI),
      ).to.be.revertedWithCustomError(contract, 'InvalidPartnerAddress');
    });

    it('should revert for zero target minutes', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, partner.address, 0, PENALTY_WEI, BONUS_WEI),
      ).to.be.revertedWithCustomError(contract, 'InvalidTargetMinutes');
    });

    it('should revert for excessive target minutes', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, partner.address, 500, PENALTY_WEI, BONUS_WEI),
      ).to.be.revertedWithCustomError(contract, 'InvalidTargetMinutes');
    });

    it('should revert for unauthorized caller', async function () {
      const { contract, unauthorized, partner } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract
          .connect(unauthorized)
          .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI),
      ).to.be.reverted;
    });
  });

  describe('recordSLABreach', function () {
    it('should record a breach', async function () {
      const { contract, slaManager, recorder, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await expect(contract.connect(recorder).recordSLABreach(CONTRACT_ID_1, ORDER_ID_1, 60))
        .to.emit(contract, 'SLABreachRecorded');
    });

    it('should update breach statistics', async function () {
      const { contract, slaManager, recorder, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(recorder).recordSLABreach(CONTRACT_ID_1, ORDER_ID_1, 60);

      const stats = await contract.getContractStats(CONTRACT_ID_1);
      expect(stats.totalBreaches).to.equal(1n);
    });

    it('should revert for non-existent contract', async function () {
      const { contract, recorder } = await loadFixture(deployPartnerSLAFixture);

      await expect(
        contract.connect(recorder).recordSLABreach(CONTRACT_ID_1, ORDER_ID_1, 60),
      ).to.be.revertedWithCustomError(contract, 'ContractNotFound');
    });
  });

  describe('recordSLASuccess', function () {
    it('should record a success', async function () {
      const { contract, slaManager, recorder, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await expect(contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_1, 35))
        .to.emit(contract, 'SLASuccessRecorded');
    });

    it('should update success statistics', async function () {
      const { contract, slaManager, recorder, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_1, 35);

      const stats = await contract.getContractStats(CONTRACT_ID_1);
      expect(stats.totalSuccesses).to.equal(1n);
    });
  });

  describe('executeWeeklySettlement', function () {
    it('should execute settlement with breaches (penalty)', async function () {
      const { contract, slaManager, recorder, settler, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(recorder).recordSLABreach(CONTRACT_ID_1, ORDER_ID_1, 60);
      await contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_2, 35);

      const currentBlock = await ethers.provider.getBlock('latest');
      const currentWeek = BigInt(currentBlock!.timestamp) / (7n * 24n * 60n * 60n);

      await expect(
        contract.connect(settler).executeWeeklySettlement(CONTRACT_ID_1, currentWeek),
      ).to.emit(contract, 'WeeklySettlementExecuted');
    });

    it('should execute settlement with perfect week (bonus)', async function () {
      const { contract, slaManager, recorder, settler, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_1, 30);
      await contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_2, 35);

      const currentBlock = await ethers.provider.getBlock('latest');
      const currentWeek = BigInt(currentBlock!.timestamp) / (7n * 24n * 60n * 60n);

      await contract.connect(settler).executeWeeklySettlement(CONTRACT_ID_1, currentWeek);

      const stats = await contract.getContractStats(CONTRACT_ID_1);
      expect(stats.totalBonuses).to.equal(BONUS_WEI);
    });

    it('should revert for already settled week', async function () {
      const { contract, slaManager, recorder, settler, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(recorder).recordSLASuccess(CONTRACT_ID_1, ORDER_ID_1, 30);

      const currentBlock = await ethers.provider.getBlock('latest');
      const currentWeek = BigInt(currentBlock!.timestamp) / (7n * 24n * 60n * 60n);

      await contract.connect(settler).executeWeeklySettlement(CONTRACT_ID_1, currentWeek);

      await expect(
        contract.connect(settler).executeWeeklySettlement(CONTRACT_ID_1, currentWeek),
      ).to.be.revertedWithCustomError(contract, 'WeekAlreadySettled');
    });
  });

  describe('updateContractStatus', function () {
    it('should suspend a contract', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await expect(contract.connect(slaManager).updateContractStatus(CONTRACT_ID_1, 1))
        .to.emit(contract, 'SLAContractStatusChanged')
        .withArgs(CONTRACT_ID_1, 0, 1);

      expect(await contract.getActiveContractCount()).to.equal(0n);
    });

    it('should reactivate a suspended contract', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      await contract.connect(slaManager).updateContractStatus(CONTRACT_ID_1, 1);
      await contract.connect(slaManager).updateContractStatus(CONTRACT_ID_1, 0);

      expect(await contract.getActiveContractCount()).to.equal(1n);
    });
  });

  describe('contractExists', function () {
    it('should return false for non-existent contract', async function () {
      const { contract } = await loadFixture(deployPartnerSLAFixture);
      expect(await contract.contractExists(CONTRACT_ID_1)).to.be.false;
    });

    it('should return true for existing contract', async function () {
      const { contract, slaManager, partner } = await loadFixture(deployPartnerSLAFixture);

      await contract
        .connect(slaManager)
        .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI);

      expect(await contract.contractExists(CONTRACT_ID_1)).to.be.true;
    });
  });

  describe('Pausable', function () {
    it('should prevent contract creation when paused', async function () {
      const { contract, slaManager, pauser, partner } = await loadFixture(
        deployPartnerSLAFixture,
      );

      await contract.connect(pauser).pause();

      await expect(
        contract
          .connect(slaManager)
          .createContract(CONTRACT_ID_1, partner.address, TARGET_45_MIN, PENALTY_WEI, BONUS_WEI),
      ).to.be.reverted;
    });
  });
});
