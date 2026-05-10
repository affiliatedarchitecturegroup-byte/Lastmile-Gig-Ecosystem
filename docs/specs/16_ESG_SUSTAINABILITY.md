# ESG & SUSTAINABILITY FRAMEWORK
**Document:** 16 of 19 | **Version:** 1.0 | **Classification:** Confidential

---

## 1. ESG Strategic Purpose

The ESG framework is a **core revenue and compliance asset**. It enables:
- Access to DFI funding (sefa, KZN Growth Fund mandate ESG reporting)
- Premium pricing for ESG-conscious corporate fleet clients
- Impact investor capital (B-Corp alignment pathway)
- Regulatory compliance as SA tightens emissions regulations

---

## 2. Environmental Pillar

### 2.1 EV Fleet Programme
**Target:** 30% of Driver Rental fleet to be electric scooters by Year 2

```
EV Fleet Tracking (TimescaleDB):
- Per-vehicle energy consumption (kWh/km)
- Battery charge cycles
- Solar charging contribution (% of total energy)
- Emissions avoided vs equivalent ICE vehicle (kg CO2)

Solar Charging Stations:
- Partner with solar providers for charging hubs in Pinetown, Durban CBD, PMB
- Station telemetry: charge rate, solar generation, grid draw
- Integrated into ESG dashboard in real-time
```

### 2.2 Carbon Footprint Model
```python
# Carbon calculation per delivery
def calculate_delivery_carbon(route_km: float, vehicle_type: str, is_ev: bool) -> float:
    EMISSION_FACTORS = {
        'scooter_ice': 0.065,    # kg CO2 per km (125cc scooter)
        'bicycle': 0.0,          # zero emissions
        'car_petrol': 0.171,     # kg CO2 per km (average petrol car)
        'van_diesel': 0.210,     # kg CO2 per km
        'scooter_ev': 0.012,     # kg CO2 per km (grid electricity, SA mix)
    }
    key = f"{vehicle_type}_ev" if is_ev else f"{vehicle_type}_ice"
    return route_km * EMISSION_FACTORS.get(key, 0.100)

# Stored per delivery in carbon_events TimescaleDB hypertable
# Aggregated daily/monthly for ESG reporting
```

---

## 3. Social Pillar

| Initiative | Metric | Target |
|---|---|---|
| Job creation | Registered active drivers | 500 by Year 1, 2000 by Year 3 |
| Driver insurance | % of deliveries covered | 100% (mandatory) |
| Driver financial inclusion | % using Polygon CDK wallet | 40% by Year 2 |
| Skills development | SETA-registered training modules | Delivered via driver app |
| BBBEE alignment | Ownership + management targets | Level 2 B-BBEE by Year 3 |

---

## 4. Governance Pillar

| Control | Mechanism |
|---|---|
| POPIA compliance | Audit log + annual external audit |
| Blockchain audit trail | Immutable Polygon CDK records — on-demand DFI access |
| Financial transparency | Monthly reconciliation reports (Sage-integrated) |
| Board reporting | Quarterly ESG dashboard export (PDF, DFI format) |

---

## 5. CrewAI ESG Reporting Crew

The monthly ESG report is generated entirely by the CrewAI ESG crew (with human review before publication):

```
ESG Report Contents (auto-generated):
1. Executive ESG Summary
2. Carbon footprint: total kg CO2, trend, vs baseline
3. EV fleet: current %, charge sessions, solar contribution
4. Driver welfare: insurance coverage %, claims processed
5. Job creation: active driver count, new onboardings, churn
6. POPIA compliance: audit findings, consent rates, erasure requests
7. Blockchain verification: delivery count, tx hashes sample
8. DFI-formatted appendix: aligned to sefa/KZN Growth Fund template

Human review gate: ESG Officer approves before publication
Distribution: SendGrid email to DFI contacts + stored in S3 (investor-accessible)
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
