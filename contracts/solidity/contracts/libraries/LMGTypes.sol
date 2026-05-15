// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LMGTypes
 * @author Lastmile Gig (Pty) Ltd
 * @notice Shared type definitions and constants used across all LMG contracts.
 * @dev Provides common structs, enums, and constants to reduce duplication
 *      and ensure type consistency across the smart contract suite.
 *
 * @custom:security-contact security@aagais.co.za
 * @custom:see docs/specs/06_BLOCKCHAIN_LAYER.md
 */
library LMGTypes {
    // --- GPS Coordinate Bounds (fixed point: GPS * 1e6) ---

    /// @notice Minimum valid latitude (-90 degrees)
    int256 internal constant MIN_LATITUDE = -90000000;

    /// @notice Maximum valid latitude (90 degrees)
    int256 internal constant MAX_LATITUDE = 90000000;

    /// @notice Minimum valid longitude (-180 degrees)
    int256 internal constant MIN_LONGITUDE = -180000000;

    /// @notice Maximum valid longitude (180 degrees)
    int256 internal constant MAX_LONGITUDE = 180000000;

    // --- South Africa Bounding Box (for geofence validation) ---

    /// @notice SA southern latitude bound
    int256 internal constant SA_MIN_LAT = -35000000;

    /// @notice SA northern latitude bound
    int256 internal constant SA_MAX_LAT = -22000000;

    /// @notice SA western longitude bound
    int256 internal constant SA_MIN_LNG = 16000000;

    /// @notice SA eastern longitude bound
    int256 internal constant SA_MAX_LNG = 33000000;

    // --- Time Constants ---

    /// @notice One day in seconds
    uint256 internal constant ONE_DAY = 86400;

    /// @notice One week in seconds
    uint256 internal constant ONE_WEEK = 604800;

    /// @notice Default escrow hold period (10 minutes)
    uint256 internal constant DEFAULT_HOLD_PERIOD = 600;

    // --- Platform Constants ---

    /// @notice Platform fee percentage (basis points, 100 = 1%)
    uint256 internal constant PLATFORM_FEE_BPS = 1500; // 15%

    /// @notice Maximum number of active SLA contracts per partner
    uint256 internal constant MAX_SLA_CONTRACTS_PER_PARTNER = 10;

    /// @notice Maximum DID credential validity in days
    uint256 internal constant MAX_CREDENTIAL_VALIDITY_DAYS = 1825; // 5 years

    // --- Validation Functions ---

    /**
     * @notice Validate GPS coordinates are within valid range.
     * @param lat Latitude (fixed point * 1e6)
     * @param lng Longitude (fixed point * 1e6)
     * @return valid Whether coordinates are valid
     */
    function isValidCoordinate(int256 lat, int256 lng) internal pure returns (bool valid) {
        return lat >= MIN_LATITUDE && lat <= MAX_LATITUDE &&
               lng >= MIN_LONGITUDE && lng <= MAX_LONGITUDE;
    }

    /**
     * @notice Check if GPS coordinates are within South Africa.
     * @param lat Latitude (fixed point * 1e6)
     * @param lng Longitude (fixed point * 1e6)
     * @return inSA Whether coordinates are in South Africa
     */
    function isInSouthAfrica(int256 lat, int256 lng) internal pure returns (bool inSA) {
        return lat >= SA_MIN_LAT && lat <= SA_MAX_LAT &&
               lng >= SA_MIN_LNG && lng <= SA_MAX_LNG;
    }

    /**
     * @notice Compute the distance between two GPS points using simplified
     *         Euclidean approximation (valid for short distances).
     * @param lat1 First point latitude (fixed point * 1e6)
     * @param lng1 First point longitude (fixed point * 1e6)
     * @param lat2 Second point latitude (fixed point * 1e6)
     * @param lng2 Second point longitude (fixed point * 1e6)
     * @return distanceSquared The squared distance (for comparison only)
     */
    function distanceSquared(
        int256 lat1,
        int256 lng1,
        int256 lat2,
        int256 lng2
    ) internal pure returns (uint256) {
        int256 dLat = lat2 - lat1;
        int256 dLng = lng2 - lng1;
        return uint256(dLat * dLat + dLng * dLng);
    }

    /**
     * @notice Convert a UUID string to bytes32 for on-chain storage.
     * @dev Pads or truncates to 32 bytes. Used for order/driver/customer IDs.
     * @param input Raw bytes to convert
     * @return result The bytes32 representation
     */
    function toBytes32(bytes memory input) internal pure returns (bytes32 result) {
        if (input.length == 0) return bytes32(0);
        assembly {
            result := mload(add(input, 32))
        }
    }
}
