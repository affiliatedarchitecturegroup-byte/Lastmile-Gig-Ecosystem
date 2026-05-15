//! Geofence Engine - Monitors vehicle positions against defined zones.
//!
//! Checks whether vehicles are within designated geofence boundaries
//! and generates alerts when violations occur. Supports circular
//! geofences defined by center point + radius.
//!
//! See: POLYGLOT_ARCHITECTURE.md - Section 2.4

use std::collections::HashMap;
use std::f64::consts::PI;

use chrono::Utc;
use tracing::{debug, info, instrument, warn};
use uuid::Uuid;

use crate::models::{
    AlertSeverity, AlertType, GpsPosition, MaintenanceAlert,
};

/// Geofence definition.
#[derive(Debug, Clone)]
pub struct Geofence {
    pub id: Uuid,
    pub name: String,
    pub center_lat: f64,
    pub center_lng: f64,
    pub radius_km: f64,
    pub vehicle_ids: Vec<String>,
    pub active: bool,
}

/// Result of a geofence check.
#[derive(Debug, Clone)]
pub struct GeofenceCheckResult {
    pub geofence_id: Uuid,
    pub geofence_name: String,
    pub vehicle_id: String,
    pub is_inside: bool,
    pub distance_km: f64,
    pub violation: bool,
}

/// Geofence engine that manages fence definitions and checks positions.
pub struct GeofenceEngine {
    geofences: HashMap<Uuid, Geofence>,
}

impl GeofenceEngine {
    /// Create a new geofence engine.
    pub fn new() -> Self {
        Self {
            geofences: HashMap::new(),
        }
    }

    /// Add a geofence to the engine.
    pub fn add_geofence(&mut self, geofence: Geofence) {
        info!(
            "Geofence added: '{}' at ({:.6}, {:.6}), radius={:.2}km, vehicles={}",
            geofence.name,
            geofence.center_lat,
            geofence.center_lng,
            geofence.radius_km,
            geofence.vehicle_ids.len()
        );
        self.geofences.insert(geofence.id, geofence);
    }

    /// Remove a geofence by ID.
    pub fn remove_geofence(&mut self, id: &Uuid) -> bool {
        self.geofences.remove(id).is_some()
    }

    /// Get the number of active geofences.
    pub fn active_count(&self) -> usize {
        self.geofences.values().filter(|g| g.active).count()
    }

    /// Check a vehicle position against all applicable geofences.
    ///
    /// Returns a list of check results and any violation alerts.
    #[instrument(skip(self, position), fields(vehicle_id = %position.vehicle_id))]
    pub fn check_position(
        &self,
        position: &GpsPosition,
    ) -> (Vec<GeofenceCheckResult>, Vec<MaintenanceAlert>) {
        let mut results = Vec::new();
        let mut alerts = Vec::new();

        for geofence in self.geofences.values() {
            if !geofence.active {
                continue;
            }

            // Only check geofences assigned to this vehicle
            if !geofence.vehicle_ids.contains(&position.vehicle_id)
                && !geofence.vehicle_ids.is_empty()
            {
                continue;
            }

            let distance = haversine_distance(
                geofence.center_lat,
                geofence.center_lng,
                position.latitude,
                position.longitude,
            );

            let is_inside = distance <= geofence.radius_km;
            let violation = !is_inside;

            let result = GeofenceCheckResult {
                geofence_id: geofence.id,
                geofence_name: geofence.name.clone(),
                vehicle_id: position.vehicle_id.clone(),
                is_inside,
                distance_km: distance,
                violation,
            };

            if violation {
                warn!(
                    "Geofence violation: vehicle {} is {:.2}km from '{}' (radius: {:.2}km)",
                    position.vehicle_id, distance, geofence.name, geofence.radius_km
                );

                alerts.push(MaintenanceAlert {
                    id: Uuid::new_v4(),
                    vehicle_id: position.vehicle_id.clone(),
                    alert_type: AlertType::GeofenceViolation,
                    severity: AlertSeverity::Warning,
                    message: format!(
                        "Vehicle outside geofence '{}': {:.2}km from boundary (radius: {:.2}km)",
                        geofence.name,
                        distance - geofence.radius_km,
                        geofence.radius_km
                    ),
                    value: distance,
                    threshold: geofence.radius_km,
                    created_at: Utc::now(),
                });
            } else {
                debug!(
                    "Vehicle {} inside geofence '{}': {:.2}km from center",
                    position.vehicle_id, geofence.name, distance
                );
            }

            results.push(result);
        }

        (results, alerts)
    }

    /// Get all geofences.
    pub fn list_geofences(&self) -> Vec<&Geofence> {
        self.geofences.values().collect()
    }
}

impl Default for GeofenceEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate the Haversine distance between two GPS coordinates in kilometers.
///
/// This provides accurate great-circle distance calculation for any two
/// points on the Earth's surface.
pub fn haversine_distance(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    const EARTH_RADIUS_KM: f64 = 6371.0;

    let d_lat = (lat2 - lat1).to_radians();
    let d_lng = (lng2 - lng1).to_radians();

    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (d_lng / 2.0).sin().powi(2);

    let c = 2.0 * a.sqrt().asin();

    EARTH_RADIUS_KM * c
}

/// Calculate the bearing from point 1 to point 2 in degrees.
pub fn bearing(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let d_lng = (lng2 - lng1).to_radians();

    let y = d_lng.sin() * lat2_rad.cos();
    let x = lat1_rad.cos() * lat2_rad.sin()
        - lat1_rad.sin() * lat2_rad.cos() * d_lng.cos();

    let bearing_rad = y.atan2(x);
    (bearing_rad.to_degrees() + 360.0) % 360.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn durban_cbd() -> (f64, f64) {
        (-29.858681, 31.021839)
    }

    fn umhlanga() -> (f64, f64) {
        (-29.728333, 31.087222)
    }

    fn johannesburg() -> (f64, f64) {
        (-26.205, 28.0497)
    }

    fn test_position(vehicle_id: &str, lat: f64, lng: f64) -> GpsPosition {
        GpsPosition {
            vehicle_id: vehicle_id.into(),
            timestamp: Utc::now(),
            latitude: lat,
            longitude: lng,
            speed_kmh: 50.0,
            heading: 0.0,
            accuracy_m: 5.0,
        }
    }

    #[test]
    fn test_haversine_durban_to_umhlanga() {
        let (lat1, lng1) = durban_cbd();
        let (lat2, lng2) = umhlanga();
        let dist = haversine_distance(lat1, lng1, lat2, lng2);
        // Durban CBD to Umhlanga is approximately 15-16km
        assert!(dist > 14.0 && dist < 17.0, "Distance was: {}", dist);
    }

    #[test]
    fn test_haversine_durban_to_joburg() {
        let (lat1, lng1) = durban_cbd();
        let (lat2, lng2) = johannesburg();
        let dist = haversine_distance(lat1, lng1, lat2, lng2);
        // Durban to Joburg is approximately 500-570km
        assert!(dist > 480.0 && dist < 580.0, "Distance was: {}", dist);
    }

    #[test]
    fn test_haversine_same_point() {
        let (lat, lng) = durban_cbd();
        let dist = haversine_distance(lat, lng, lat, lng);
        assert!(dist < 0.001, "Distance was: {}", dist);
    }

    #[test]
    fn test_geofence_inside() {
        let mut engine = GeofenceEngine::new();

        let (center_lat, center_lng) = durban_cbd();
        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Durban CBD Zone".into(),
            center_lat,
            center_lng,
            radius_km: 5.0,
            vehicle_ids: vec!["VEH-001".into()],
            active: true,
        });

        // Position within 5km of CBD center
        let pos = test_position("VEH-001", center_lat + 0.01, center_lng + 0.01);
        let (results, alerts) = engine.check_position(&pos);

        assert_eq!(results.len(), 1);
        assert!(results[0].is_inside);
        assert!(!results[0].violation);
        assert!(alerts.is_empty());
    }

    #[test]
    fn test_geofence_violation() {
        let mut engine = GeofenceEngine::new();

        let (center_lat, center_lng) = durban_cbd();
        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Durban CBD Zone".into(),
            center_lat,
            center_lng,
            radius_km: 5.0,
            vehicle_ids: vec!["VEH-001".into()],
            active: true,
        });

        // Position in Umhlanga (15+ km away)
        let (ulat, ulng) = umhlanga();
        let pos = test_position("VEH-001", ulat, ulng);
        let (results, alerts) = engine.check_position(&pos);

        assert_eq!(results.len(), 1);
        assert!(!results[0].is_inside);
        assert!(results[0].violation);
        assert_eq!(alerts.len(), 1);
        assert!(matches!(alerts[0].alert_type, AlertType::GeofenceViolation));
    }

    #[test]
    fn test_geofence_wrong_vehicle() {
        let mut engine = GeofenceEngine::new();

        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Test Zone".into(),
            center_lat: -29.858681,
            center_lng: 31.021839,
            radius_km: 5.0,
            vehicle_ids: vec!["VEH-002".into()],
            active: true,
        });

        let pos = test_position("VEH-001", -26.0, 28.0);
        let (results, alerts) = engine.check_position(&pos);

        // Not checked because vehicle not assigned
        assert!(results.is_empty());
        assert!(alerts.is_empty());
    }

    #[test]
    fn test_geofence_inactive() {
        let mut engine = GeofenceEngine::new();

        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Inactive Zone".into(),
            center_lat: -29.858681,
            center_lng: 31.021839,
            radius_km: 5.0,
            vehicle_ids: vec!["VEH-001".into()],
            active: false,
        });

        let pos = test_position("VEH-001", -26.0, 28.0);
        let (results, _) = engine.check_position(&pos);
        assert!(results.is_empty());
    }

    #[test]
    fn test_bearing_north() {
        let b = bearing(-30.0, 30.0, -29.0, 30.0);
        assert!(b > 350.0 || b < 10.0, "Bearing was: {}", b);
    }

    #[test]
    fn test_active_count() {
        let mut engine = GeofenceEngine::new();

        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Active".into(),
            center_lat: 0.0,
            center_lng: 0.0,
            radius_km: 1.0,
            vehicle_ids: vec![],
            active: true,
        });

        engine.add_geofence(Geofence {
            id: Uuid::new_v4(),
            name: "Inactive".into(),
            center_lat: 0.0,
            center_lng: 0.0,
            radius_km: 1.0,
            vehicle_ids: vec![],
            active: false,
        });

        assert_eq!(engine.active_count(), 1);
    }
}
