/**
 * DriverIdentity Contract Tests
 *
 * Comprehensive test suite covering:
 * - Credential issuance (happy path and error cases)
 * - Credential verification
 * - Credential revocation and suspension
 * - Credential reinstatement and renewal
 * - Access control and pausability
 *
 * Coverage target: >= 95%
 *
 * @see docs/specs/06_BLOCKCHAIN_LAYER.md - Section 2.4
 */

import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { deployDriverIdentityFixture } from './helpers/fixtures';
import {
  DRIVER_ID_1,
  DRIVER_ID_2,
  LICENCE_HASH_1,
  BIOMETRIC_HASH_1,
  PDP_HASH_1,
  ZERO_BYTES32,
  ONE_DAY,
  ONE_YEAR,
  THIRTY_DAYS,
} from './helpers/constants';

const VALIDITY_DAYS_365 = 365;
const VALIDITY_DAYS_30 = 30;

describe('DriverIdentity', function () {
  describe('Deployment', function () {
    it('should deploy with correct admin role', async function () {
      const { contract, admin } = await loadFixture(deployDriverIdentityFixture);
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('should have zero credentials initially', async function () {
      const { contract } = await loadFixture(deployDriverIdentityFixture);
      const [total, active, revoked] = await contract.getStats();
      expect(total).to.equal(0n);
      expect(active).to.equal(0n);
      expect(revoked).to.equal(0n);
    });
  });

  describe('issueCredential', function () {
    it('should issue a credential successfully', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            DRIVER_ID_1,
            LICENCE_HASH_1,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      )
        .to.emit(contract, 'CredentialIssued')
        .withArgs(DRIVER_ID_1, LICENCE_HASH_1, () => true, () => true, 1);
    });

    it('should store correct credential data', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      const cred = await contract.getCredential(DRIVER_ID_1);
      expect(cred.driverId).to.equal(DRIVER_ID_1);
      expect(cred.licenceHash).to.equal(LICENCE_HASH_1);
      expect(cred.biometricHash).to.equal(BIOMETRIC_HASH_1);
      expect(cred.pdpHash).to.equal(PDP_HASH_1);
      expect(cred.status).to.equal(0); // ACTIVE
      expect(cred.version).to.equal(1n);
    });

    it('should increment statistics', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      const [total, active] = await contract.getStats();
      expect(total).to.equal(1n);
      expect(active).to.equal(1n);
    });

    it('should revert for empty driver ID', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            ZERO_BYTES32,
            LICENCE_HASH_1,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.revertedWithCustomError(contract, 'InvalidDriverId');
    });

    it('should revert for empty licence hash', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            DRIVER_ID_1,
            ZERO_BYTES32,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.revertedWithCustomError(contract, 'InvalidLicenceHash');
    });

    it('should revert for empty biometric hash', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            DRIVER_ID_1,
            LICENCE_HASH_1,
            ZERO_BYTES32,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.revertedWithCustomError(contract, 'InvalidBiometricHash');
    });

    it('should revert for validity below minimum', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(DRIVER_ID_1, LICENCE_HASH_1, BIOMETRIC_HASH_1, PDP_HASH_1, 10),
      ).to.be.revertedWithCustomError(contract, 'InvalidValidityPeriod');
    });

    it('should revert for validity above maximum', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(authority)
          .issueCredential(DRIVER_ID_1, LICENCE_HASH_1, BIOMETRIC_HASH_1, PDP_HASH_1, 2000),
      ).to.be.revertedWithCustomError(contract, 'InvalidValidityPeriod');
    });

    it('should revert for already active credential', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            DRIVER_ID_1,
            LICENCE_HASH_1,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.revertedWithCustomError(contract, 'CredentialAlreadyActive');
    });

    it('should revert for unauthorized caller', async function () {
      const { contract, unauthorized } = await loadFixture(deployDriverIdentityFixture);

      await expect(
        contract
          .connect(unauthorized)
          .issueCredential(
            DRIVER_ID_1,
            LICENCE_HASH_1,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.reverted;
    });
  });

  describe('verifyCredential', function () {
    it('should verify an active credential as valid', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      const [valid, expiresAt, version] = await contract.verifyCredential(DRIVER_ID_1);
      expect(valid).to.be.true;
      expect(expiresAt).to.be.gt(0n);
      expect(version).to.equal(1n);
    });

    it('should report expired credential as invalid', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_30,
        );

      await time.increase(THIRTY_DAYS + ONE_DAY);

      const [valid] = await contract.verifyCredential(DRIVER_ID_1);
      expect(valid).to.be.false;
    });

    it('should revert for non-existent credential', async function () {
      const { contract } = await loadFixture(deployDriverIdentityFixture);

      await expect(contract.verifyCredential(DRIVER_ID_1)).to.be.revertedWithCustomError(
        contract,
        'CredentialNotFound',
      );
    });
  });

  describe('revokeCredential', function () {
    it('should revoke a credential', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await expect(
        contract.connect(authority).revokeCredential(DRIVER_ID_1, 'Failed background check'),
      )
        .to.emit(contract, 'CredentialRevoked')
        .withArgs(DRIVER_ID_1, 'Failed background check', authority.address, () => true);
    });

    it('should update statistics after revocation', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await contract.connect(authority).revokeCredential(DRIVER_ID_1, 'Test revocation');

      const [total, active, revoked] = await contract.getStats();
      expect(total).to.equal(1n);
      expect(active).to.equal(0n);
      expect(revoked).to.equal(1n);
    });

    it('should store revocation history', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await contract.connect(authority).revokeCredential(DRIVER_ID_1, 'Test revocation');

      const history = await contract.getRevocationHistory(DRIVER_ID_1);
      expect(history.length).to.equal(1);
      expect(history[0].reason).to.equal('Test revocation');
    });
  });

  describe('suspendCredential', function () {
    it('should suspend an active credential', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await expect(contract.connect(authority).suspendCredential(DRIVER_ID_1))
        .to.emit(contract, 'CredentialSuspended')
        .withArgs(DRIVER_ID_1, authority.address, () => true);

      const cred = await contract.getCredential(DRIVER_ID_1);
      expect(cred.status).to.equal(3); // SUSPENDED
    });

    it('should revert if credential is not active', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await contract.connect(authority).suspendCredential(DRIVER_ID_1);

      await expect(
        contract.connect(authority).suspendCredential(DRIVER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'CredentialNotActive');
    });
  });

  describe('reinstateCredential', function () {
    it('should reinstate a suspended credential', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await contract.connect(authority).suspendCredential(DRIVER_ID_1);

      await expect(contract.connect(authority).reinstateCredential(DRIVER_ID_1))
        .to.emit(contract, 'CredentialReinstated')
        .withArgs(DRIVER_ID_1, authority.address, () => true);

      const cred = await contract.getCredential(DRIVER_ID_1);
      expect(cred.status).to.equal(0); // ACTIVE
    });

    it('should revert if credential is not suspended', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      await expect(
        contract.connect(authority).reinstateCredential(DRIVER_ID_1),
      ).to.be.revertedWithCustomError(contract, 'CredentialNotActive');
    });
  });

  describe('renewCredential', function () {
    it('should renew a credential with new expiry', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_30,
        );

      await expect(
        contract.connect(authority).renewCredential(DRIVER_ID_1, VALIDITY_DAYS_365),
      )
        .to.emit(contract, 'CredentialRenewed');

      const cred = await contract.getCredential(DRIVER_ID_1);
      expect(cred.version).to.equal(2n);
    });
  });

  describe('credentialExists', function () {
    it('should return false for non-existent credential', async function () {
      const { contract } = await loadFixture(deployDriverIdentityFixture);
      expect(await contract.credentialExists(DRIVER_ID_1)).to.be.false;
    });

    it('should return true for existing credential', async function () {
      const { contract, authority } = await loadFixture(deployDriverIdentityFixture);

      await contract
        .connect(authority)
        .issueCredential(
          DRIVER_ID_1,
          LICENCE_HASH_1,
          BIOMETRIC_HASH_1,
          PDP_HASH_1,
          VALIDITY_DAYS_365,
        );

      expect(await contract.credentialExists(DRIVER_ID_1)).to.be.true;
    });
  });

  describe('Pausable', function () {
    it('should prevent issuance when paused', async function () {
      const { contract, authority, pauser } = await loadFixture(deployDriverIdentityFixture);

      await contract.connect(pauser).pause();

      await expect(
        contract
          .connect(authority)
          .issueCredential(
            DRIVER_ID_1,
            LICENCE_HASH_1,
            BIOMETRIC_HASH_1,
            PDP_HASH_1,
            VALIDITY_DAYS_365,
          ),
      ).to.be.reverted;
    });
  });
});
