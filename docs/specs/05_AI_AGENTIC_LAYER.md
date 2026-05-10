# AI & AGENTIC INTELLIGENCE LAYER
**Document:** 05 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Philosophy: Intelligence at the Core

AI in Lastmile Gig is not a bolt-on feature. It is the core operating principle. Every dispatch decision, every route, every fraud check, every ESG report, every partner onboarding flow, and every demand forecast is AI-mediated — either fully automated or with a human-in-the-loop gate.

The agentic layer is built on three complementary frameworks:

| Framework | Role | Paradigm |
|---|---|---|
| **LangChain** | LLM orchestration, RAG pipelines, document processing | Chain-based, sequential |
| **LangGraph** | Stateful multi-step agent workflows with conditional branching | Graph-based, stateful |
| **CrewAI** | Multi-agent crews where specialised agents collaborate | Role-based, collaborative |

All agents run on **AWS Bedrock (Claude as LLM)** with **Pinecone** as the vector store for RAG retrieval. Custom predictive models run on **AWS SageMaker**.

---

## 2. LangChain — Orchestration & RAG Pipelines

### 2.1 Partner Onboarding Agent
**Purpose:** Guide new restaurant/corporate partners through the onboarding process, extract structured data from submitted documents, and pre-populate the partner profile.

```python
from langchain.agents import create_openai_functions_agent
from langchain.tools import tool
from langchain_aws import ChatBedrock

@tool
def extract_business_registration(document: str) -> dict:
    """Extract company name, reg number, VAT, and directors from CIPC document."""
    ...

@tool
def validate_bank_details(account_number: str, branch_code: str) -> bool:
    """Validate South African bank account via Paystack verification API."""
    ...

@tool
def check_popia_consent(partner_id: str) -> bool:
    """Verify POPIA consent has been recorded for this partner."""
    ...

partner_onboarding_chain = (
    document_extraction_chain
    | validation_chain
    | profile_population_chain
    | compliance_check_chain
    | approval_gate  # HITL: human reviews before activation
)
```

### 2.2 Menu Extraction Pipeline
**Purpose:** When a restaurant partner uploads a PDF menu or image, extract structured menu data (items, prices, categories, allergens) and populate the Sanity CMS schema.

```python
menu_extraction_chain = (
    DocumentLoader(file_type=["pdf", "image"])
    | OCRExtractor(provider="AWS Textract")
    | MenuStructurer(llm=bedrock_claude)  # parse natural menu text to schema
    | AllergenDetector(llm=bedrock_claude)
    | SanityCMSWriter(schema="menuItem")
)
```

### 2.3 Driver FAQ RAG Agent
**Purpose:** Answer driver questions about earnings, rentals, insurance, and platform policies using a RAG pipeline over the driver knowledge base.

```python
driver_faq_chain = (
    PineconeRetriever(index="driver-knowledge-base", top_k=5)
    | ContextualCompressor()
    | ChatBedrock(model_id="anthropic.claude-3-5-sonnet")
    | ResponseFormatter(style="conversational_zulu_english")  # SA localisation
)
```

---

## 3. LangGraph — Stateful Workflow Agents

LangGraph is used for any workflow that requires **state persistence across multiple steps**, **conditional branching**, **tool calls**, and **human-in-the-loop gates**.

### 3.1 Dispatch Decision Graph
**Purpose:** When a new order is placed and the dispatch engine has identified candidate drivers, the LangGraph workflow evaluates options, applies weighted scoring, and produces a ranked dispatch recommendation — with a HITL gate for low-confidence decisions.

```python
from langgraph.graph import StateGraph, END

class DispatchState(TypedDict):
    order: Order
    candidate_drivers: list[Driver]
    route_options: list[Route]
    driver_scores: list[float]
    dispatch_decision: Optional[DispatchDecision]
    confidence: float
    human_review_required: bool

dispatch_graph = StateGraph(DispatchState)
dispatch_graph.add_node("score_drivers", score_drivers_node)
dispatch_graph.add_node("optimise_routes", optimise_routes_node)
dispatch_graph.add_node("compute_dispatch", compute_dispatch_node)
dispatch_graph.add_node("human_review", human_review_node)  # HITL gate
dispatch_graph.add_node("execute_dispatch", execute_dispatch_node)

dispatch_graph.add_conditional_edges(
    "compute_dispatch",
    lambda s: "human_review" if s["confidence"] < 0.75 else "execute_dispatch"
)

# HITL gate: if confidence < 75%, ops team reviews before dispatch
```

### 3.2 Fraud Investigation Graph
**Purpose:** When an anomaly is detected (unusual payment pattern, GPS spoofing, fake delivery confirmation), a multi-step investigation workflow runs — escalating to human review only when required.

```python
fraud_graph = StateGraph(FraudState)
fraud_graph.add_node("analyse_transaction", analyse_transaction_node)
fraud_graph.add_node("check_gps_validity", check_gps_validity_node)
fraud_graph.add_node("check_driver_history", check_driver_history_node)
fraud_graph.add_node("check_payment_pattern", check_payment_pattern_node)
fraud_graph.add_node("compute_risk_score", compute_risk_score_node)
fraud_graph.add_node("auto_block", auto_block_node)       # risk > 0.90
fraud_graph.add_node("human_escalation", human_node)      # 0.70-0.90 HITL
fraud_graph.add_node("clear_transaction", clear_node)     # risk < 0.70

fraud_graph.add_conditional_edges("compute_risk_score", risk_router)
```

### 3.3 Risk Scoring Graph
**Purpose:** Per-delivery insurance risk scoring — passed to Naked Insurance / Guardrisk API to determine micro-insurance premium for each delivery.

```python
# Inputs: driver_id, vehicle_id, route, time_of_day, weather, area_crime_index
# Output: risk_score (0.0–1.0), recommended_premium, coverage_tier
```

### 3.4 Partner Compliance Graph
**Purpose:** Ongoing compliance monitoring for all active restaurant and corporate partners — POPIA data handling checks, SLA breach detection, and automated escalation.

---

## 4. CrewAI — Multi-Agent Crews

CrewAI crews are used for **complex, multi-faceted tasks** that benefit from specialised agent roles working in parallel or sequence.

### 4.1 Demand Forecasting Crew
```python
from crewai import Agent, Task, Crew

data_analyst = Agent(
    role="Data Analyst",
    goal="Analyse historical order data by zone, time, and weather patterns",
    tools=[TimescaleDBTool(), WeatherAPITool(), PublicHolidayTool()],
    llm=bedrock_claude
)

regional_planner = Agent(
    role="Regional Operations Planner",
    goal="Translate demand forecasts into driver allocation recommendations by zone",
    tools=[ZoneMapTool(), DriverAvailabilityTool()],
    llm=bedrock_claude
)

forecaster = Agent(
    role="Lead Forecaster",
    goal="Synthesise analysis into a 24-hour demand forecast report",
    tools=[SageMakerInferenceTool()],  # custom time-series model
    llm=bedrock_claude
)

demand_crew = Crew(
    agents=[data_analyst, regional_planner, forecaster],
    tasks=[analyse_task, plan_task, forecast_task],
    process=Process.sequential,
    output_format=DemandForecastReport
)
# Runs every 4 hours via BullMQ scheduled job
```

### 4.2 Route Optimisation Crew
```python
map_analyst = Agent(
    role="Map & Traffic Analyst",
    goal="Identify current traffic conditions and road closures on active routes",
    tools=[GoogleMapsAPITool(), OSRMTool(), TrafficDataTool()]
)

route_planner = Agent(
    role="Route Planner",
    goal="Generate optimal multi-stop routes for active driver fleet",
    tools=[OSRMOptimiserTool(), FleetStatusTool()]
)

route_crew = Crew(
    agents=[map_analyst, route_planner],
    tasks=[traffic_analysis_task, route_generation_task],
    process=Process.parallel
)
# Triggered on every new dispatch event via Kafka consumer
```

### 4.3 ESG Reporting Crew
```python
carbon_analyst = Agent(
    role="Carbon Footprint Analyst",
    goal="Calculate total CO2 emissions across all deliveries in the reporting period",
    tools=[TimescaleDBTool(), EmissionFactorAPITool()]
)

fleet_auditor = Agent(
    role="EV Fleet Auditor",
    goal="Audit EV fleet percentage, charging station utilisation, and solar energy contribution",
    tools=[FleetServiceTool(), SolarMonitorTool()]
)

report_writer = Agent(
    role="ESG Report Writer",
    goal="Compile all ESG data into a DFI-compliant ESG report",
    tools=[PDFGeneratorTool(), SanityPublishTool()]
)

esg_crew = Crew(
    agents=[carbon_analyst, fleet_auditor, report_writer],
    tasks=[carbon_task, fleet_audit_task, report_task],
    process=Process.hierarchical,
    manager_llm=bedrock_claude
)
# Runs monthly, triggered via BullMQ cron job
```

### 4.4 Partner Onboarding Crew
```python
document_reviewer = Agent(
    role="Document Reviewer",
    goal="Review and validate all submitted partner documents (CIPC, tax clearance, bank details)"
)

compliance_checker = Agent(
    role="Compliance Officer",
    goal="Check POPIA consent, FSCA licensing (if insurance-adjacent), and SLA terms"
)

approver = Agent(
    role="Onboarding Approver",
    goal="Make final onboarding recommendation and trigger HITL approval gate"
)
# HITL: human ops team member reviews crew recommendation before partner activation
```

---

## 5. AWS SageMaker — Custom Predictive Models

| Model | Type | Input Features | Output | Retrain Frequency |
|---|---|---|---|---|
| Driver Performance Scorer | XGBoost | delivery_time, acceptance_rate, ratings, cancellations, fraud_flags | score 0–100 | Weekly |
| Demand Forecaster | Prophet + LSTM | historical_orders, weather, public_holidays, zone, time_of_day | demand by zone/hour | Daily |
| Fraud Detector | Isolation Forest | payment_pattern, gps_delta, delivery_time_variance, device_fingerprint | risk_score 0–1 | Daily |
| Route Quality Predictor | Random Forest | route, traffic, time, driver_history | estimated_delivery_time | Weekly |
| Churn Predictor (Customers) | Gradient Boost | order_frequency, last_order_days, avg_spend, complaint_count | churn_probability | Monthly |

---

## 6. Human-in-the-Loop (HITL) Protocol

All agentic workflows follow this HITL protocol:

```
CONFIDENCE THRESHOLD     ACTION
─────────────────────────────────────────────────────
>= 0.90                  Fully automated — agent executes without review
0.70 – 0.89              HITL gate — agent presents recommendation,
                         ops team member approves/rejects via UI
< 0.70                   Escalated — agent flags for senior review,
                         provides full reasoning trace
```

**HITL Approval UI:**  
Built into the Angular Command Centre (Module 19). Agents surface pending approvals with full reasoning chain, tool call history, and confidence breakdown. Ops staff approve, reject, or override with audit log entry.

**Audit Trail:**  
Every agent decision — automated or HITL — is recorded to:
1. PostgreSQL (Supabase) — structured decision log
2. MongoDB Atlas — full reasoning trace (LangGraph state snapshot)
3. Polygon CDK — immutable hash of all financial agent decisions

---

## 7. Pinecone Vector Database — RAG Architecture

```
INDEX                      CONTENT                         DIMENSIONS
─────────────────────────────────────────────────────────────────────
driver-knowledge-base      Platform policies, FAQs, T&Cs   1536 (Titan)
partner-docs               Restaurant/partner guides        1536
delivery-history           Historical delivery records      1536
regulatory-docs            POPIA, FSCA, CIPC guidance       1536
esg-benchmarks             DFI ESG requirements, targets    1536
```

**Embedding Model:** Amazon Titan Text Embeddings V2  
**Retrieval Strategy:** Hybrid (dense + sparse) with MMR reranking  
**Chunking Strategy:** 512 tokens, 50-token overlap, semantic boundary detection

---

## 8. Agent Monitoring & Observability

All agent runs are instrumented with:
- **LangSmith** — LangChain/LangGraph trace visualisation
- **OpenTelemetry** — agent execution time, token usage, tool call latency
- **Grafana Dashboard** — agent health, success/failure rates, HITL frequency
- **Sentry** — agent exception capture with full LangGraph state snapshot
- **MongoDB Atlas** — full agent run history (for compliance and audit)

```python
# Every agent service is instrumented with OTel
from opentelemetry import trace
tracer = trace.get_tracer("lmg.ai-service")

with tracer.start_as_current_span("dispatch_decision_graph") as span:
    span.set_attribute("order.id", order_id)
    span.set_attribute("candidates.count", len(candidates))
    result = dispatch_graph.invoke(state)
    span.set_attribute("confidence", result["confidence"])
    span.set_attribute("hitl.required", result["human_review_required"])
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
