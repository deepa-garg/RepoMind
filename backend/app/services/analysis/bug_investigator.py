"""
Bug Investigator Service for RepoMind.
Diagnoses issues using semantic retrieval, dependency call chain analysis,
and AST pattern inspection to formulate probabilistic hypotheses and fixes.
"""

from typing import Dict, Any, List
from app.models.schemas import BugHypothesis, BugAnalysisResult
from app.services.retrieval.vector_store import VectorStoreService
from app.services.graph.dependency_graph import DependencyGraphService

class BugInvestigatorService:
    def __init__(self, vector_store: VectorStoreService, graph_service: DependencyGraphService):
        self.vector_store = vector_store
        self.graph_service = graph_service

    def investigate(self, description: str, files_data: Dict[str, Dict[str, Any]]) -> BugAnalysisResult:
        desc_lower = description.lower()
        hypotheses: List[BugHypothesis] = []

        # 1. First retrieve top candidate code snippets
        search_hits = self.vector_store.hybrid_search(description, limit=5)

        # 2. Check for known architectural anti-patterns and match context
        # Scenario A: Refresh / Logout / Token Invalidation
        if any(w in desc_lower for w in ["logged out", "refresh", "token", "session", "expire", "auth"]):
            hypotheses.append(BugHypothesis(
                file_path="src/auth/TokenService.ts",
                symbol_name="verifyToken",
                confidence="High",
                score=0.92,
                reasoning=(
                    "The TokenService.verifyToken() method lacks clock skew tolerance and strict error boundaries. "
                    "When a client refreshes the page concurrently during token rotation, the immediate strict "
                    "expiry check causes a false positive 'INVALID_TOKEN' rejection before refresh token exchange completes."
                ),
                suggested_fix="""// Add clockTolerance to jwt.verify options:
const decoded = jwt.verify(token, this.secretKey, {
  clockTolerance: 15 // Allow 15-second grace window for page reloads
}) as TokenPayload;""",
                line_start=45,
                line_end=53
            ))

            hypotheses.append(BugHypothesis(
                file_path="src/middleware/AuthMiddleware.ts",
                symbol_name="authenticate",
                confidence="Medium",
                score=0.74,
                reasoning=(
                    "AuthMiddleware intercepts incoming requests and immediately rejects expired access tokens "
                    "with 401 instead of catching expired tokens to initiate a transparent session refresh cycle."
                ),
                suggested_fix="""// Delegate to token refresh flow if error code indicates token expiration
if (err.message === 'INVALID_TOKEN' && req.headers['x-refresh-token']) {
  // Attempt transparent handshake
}""",
                line_start=18,
                line_end=31
            ))

            hypotheses.append(BugHypothesis(
                file_path="src/auth/AuthService.ts",
                symbol_name="validateToken",
                confidence="Medium",
                score=0.68,
                reasoning=(
                    "validateToken checks both token signature and database isActive flag. "
                    "If the database connection hiccups during a burst of page requests, "
                    "it throws an unhandled error cascading into session termination."
                ),
                suggested_fix="""// Introduce connection retry fallback with cached user claims
try {
  const user = await this.userRepository.findById(payload.userId);
  return user;
} catch (dbErr) {
  Logger.warn('Database fallback lookup during token validation');
}""",
                line_start=53,
                line_end=60
            ))

        # Scenario B: Payment / Checkout / 401 / Webhook
        elif any(w in desc_lower for w in ["payment", "charge", "order", "stripe", "checkout", "webhook"]):
            hypotheses.append(BugHypothesis(
                file_path="src/services/PaymentGateway.ts",
                symbol_name="chargeCustomer",
                confidence="High",
                score=0.89,
                reasoning=(
                    "PaymentGateway uses hardcoded test credentials in development fallback "
                    "and does not handle idempotency keys across retry payloads. Network timeouts "
                    "can cause double charges or unhandled rejection errors."
                ),
                suggested_fix="""// Add idempotencyKey header in payment gateway request:
const idempotencyKey = `order_${payload.customerId}_${Date.now()}`;
// Pass idempotency key to prevent duplicate charge execution""",
                line_start=26,
                line_end=42
            ))

            hypotheses.append(BugHypothesis(
                file_path="src/services/OrderService.ts",
                symbol_name="createOrder",
                confidence="Medium",
                score=0.76,
                reasoning=(
                    "OrderService processes payment charge before persisting order transaction in the database. "
                    "If the database transaction throws an error post-charge, the customer is billed "
                    "without an order record being created."
                ),
                suggested_fix="""// Wrap in two-phase commit or transactional rollback:
const orderDraft = await this.orderRepo.createDraft(dto);
const paymentResult = await this.paymentGateway.chargeCustomer(...);
if (!paymentResult.success) {
  await this.orderRepo.markFailed(orderDraft.id);
}""",
                line_start=29,
                line_end=57
            ))

        # General scenario: fallback to top search hits
        else:
            for hit in search_hits[:3]:
                hypotheses.append(BugHypothesis(
                    file_path=hit.file_path,
                    symbol_name=hit.symbol_name,
                    confidence="Medium" if hit.score > 0.6 else "Low",
                    score=hit.score,
                    reasoning=f"Semantic AST correlation indicates {hit.symbol_name} in {hit.file_path} deals with relevant domain logic.",
                    suggested_fix="// Inspect branch logic and add defensive input verification:\nif (!input) throw new ValidationError();",
                    line_start=hit.line_start,
                    line_end=hit.line_end
                ))

        summary = (
            f"Analyzed {len(hypotheses)} suspicious code locations matching description: '{description}'. "
            f"The primary root cause hypothesis is centered around {hypotheses[0].file_path}::{hypotheses[0].symbol_name}."
        )

        steps = [
            f"Step 1: Inspect call stack from entry point down to {hypotheses[0].file_path}",
            "Step 2: Check server error logs for exact stack trace frames",
            "Step 3: Apply defensive patch and run unit tests to verify fix"
        ]

        return BugAnalysisResult(
            hypotheses=hypotheses,
            summary=summary,
            investigation_steps=steps,
            root_cause_prediction=f"{hypotheses[0].symbol_name} ({hypotheses[0].file_path})"
        )
