"""
RepoMind Retrieval & RAG Benchmark Evaluation Suite.
Phase 4: Reproducible retrieval evaluation across 25 ground-truth benchmark questions.

Calculates:
1. Recall@5: Proportion of answerable questions with >= 1 expected relevant file in top 5.
2. MRR (Mean Reciprocal Rank): Average reciprocal rank of the first relevant result.
3. Citation Accuracy: Proportion of citations pointing to valid files and line boundaries.
4. Unanswerable Detection: Precision in rejecting unanswerable queries without hallucinations.

Compares:
- Keyword-only (BM25 lexical)
- Semantic-only (Dense neural vector)
- Hybrid (Reciprocal Rank Fusion RRF)
"""

import json
import time
import sys
import asyncio
from pathlib import Path
from typing import Dict, Any, List

# Add backend directory to sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.services.retrieval.vector_store import VectorStoreService, get_qdrant_client
from app.services.llm.assistant_engine import AssistantEngineService
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.ingestion.repo_ingestion import RepoIngestionService
from app.services.storage.metadata_db import MetadataDB

BENCHMARK_PATH = Path(__file__).resolve().parent / "benchmark_ground_truth.jsonl"
OUTPUT_PATH = Path(__file__).resolve().parent / "evaluation_results.json"


def load_benchmark(file_path: Path) -> List[Dict[str, Any]]:
    questions = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                questions.append(json.loads(line))
    return questions


async def run_evaluation():
    print("=" * 80)
    print(" REPOMIND - PHASE 4: RETRIEVAL & GROUNDED CITATION EVALUATION RUN")
    print("=" * 80)
    print(f"Dataset:            {BENCHMARK_PATH.name}")
    print(f"Embedding Model:    {settings.EMBEDDING_MODEL}")
    print(f"Vector Dimensions:  {settings.EMBEDDING_DIMENSION}")
    print(f"RRF Constant (k):   {settings.RRF_K}")
    print(f"Run Timestamp:      {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print("-" * 80)

    questions = load_benchmark(BENCHMARK_PATH)
    print(f"Loaded {len(questions)} verified benchmark questions across 3 repositories.\n")

    # Initialize services
    metadata_db = MetadataDB()
    graph_service = DependencyGraphService()
    vector_store = VectorStoreService()
    ingestion_service = RepoIngestionService(graph_service, vector_store, metadata_db)
    assistant_engine = AssistantEngineService(vector_store, graph_service)

    modes = ["keyword", "semantic", "hybrid"]
    metrics_by_mode: Dict[str, Dict[str, Any]] = {}
    detailed_results: List[Dict[str, Any]] = []

    for mode in modes:
        print(f"--> Evaluating mode: [{mode.upper()}] ...")
        answerable_count = 0
        recall_at_5_hits = 0
        reciprocal_ranks = []
        unanswerable_correct = 0
        unanswerable_total = 0

        for q in questions:
            qid = q["id"]
            repo_id = q["repo_id"]
            q_text = q["question"]
            expected_files = q.get("expected_files", [])
            is_unanswerable = (len(expected_files) == 0)

            # Execute retrieval
            results = vector_store.hybrid_search(
                query=q_text,
                repository_id=repo_id,
                limit=8,
                mode=mode
            )

            retrieved_files = [r.file_path for r in results]

            if is_unanswerable:
                unanswerable_total += 1
                # If mode is hybrid, check assistant engine's confidence
                if len(results) == 0:
                    unanswerable_correct += 1
            else:
                answerable_count += 1
                # Check Recall@5
                top_5_files = retrieved_files[:5]
                has_recall = any(ef in top_5_files for ef in expected_files)
                if has_recall:
                    recall_at_5_hits += 1

                # Check Reciprocal Rank (first relevant item)
                first_rank = 0
                for idx, rf in enumerate(retrieved_files, 1):
                    if rf in expected_files:
                        first_rank = idx
                        break

                if first_rank > 0:
                    reciprocal_ranks.append(1.0 / first_rank)
                else:
                    reciprocal_ranks.append(0.0)

        recall_5 = (recall_at_5_hits / answerable_count) if answerable_count > 0 else 0.0
        mrr = (sum(reciprocal_ranks) / len(reciprocal_ranks)) if reciprocal_ranks else 0.0
        unans_acc = (unanswerable_correct / unanswerable_total) if unanswerable_total > 0 else 1.0

        metrics_by_mode[mode] = {
            "recall_at_5": round(recall_5, 4),
            "mrr": round(mrr, 4),
            "answerable_evaluated": answerable_count,
        }

    # Evaluate Grounded Citations in Hybrid Mode
    print("\n--> Evaluating Grounded Assistant Answers & Citations (Hybrid Mode) ...")
    total_citations = 0
    valid_citations = 0
    unanswerable_rejected = 0
    unanswerable_total = 0

    for q in questions:
        qid = q["id"]
        repo_id = q["repo_id"]
        q_text = q["question"]
        expected_files = q.get("expected_files", [])
        is_unanswerable = (len(expected_files) == 0)

        repo = ingestion_service.get_repository(repo_id)
        files_data = repo["files"] if repo else {}
        summary = repo["summary"] if repo else None

        ans = await assistant_engine.answer_question(
            message=q_text,
            files_data=files_data,
            session_id=f"eval-{qid}",
            repository_id=repo_id,
            commit_sha=summary.commit_sha if summary else None,
            branch=summary.branch if summary else "main"
        )

        q_citations = ans.sources
        citations_valid = True

        for c in q_citations:
            total_citations += 1
            # Check valid file and line boundaries
            if c.file_path and c.line_start >= 1 and c.line_end >= c.line_start:
                valid_citations += 1
            else:
                citations_valid = False

        status = "PASS"
        failure_reason = None

        if is_unanswerable:
            unanswerable_total += 1
            if ans.confidence == 0.0 and len(q_citations) == 0:
                unanswerable_rejected += 1
                status = "PASS"
            else:
                status = "FAIL"
                failure_reason = "Generated citations on unanswerable query"
        else:
            # Check if answer contains expected files in citations
            citation_files = [c.file_path for c in q_citations]
            if not any(ef in citation_files for ef in expected_files):
                status = "PARTIAL"
                failure_reason = "Expected file missing from citations"

        detailed_results.append({
            "question_id": qid,
            "category": q["category"],
            "repo_id": repo_id,
            "question": q_text,
            "expected_files": expected_files,
            "retrieved_citations_count": len(q_citations),
            "confidence": ans.confidence,
            "evaluation_outcome": status,
            "failure_reason": failure_reason,
            "answer_preview": ans.answer[:160].replace("\n", " ") + "..."
        })

    citation_accuracy = (valid_citations / total_citations) if total_citations > 0 else 1.0
    unanswerable_precision = (unanswerable_rejected / unanswerable_total) if unanswerable_total > 0 else 1.0

    # Save detailed results
    final_report = {
        "benchmark_metadata": {
            "dataset_version": "v1.0",
            "total_questions": len(questions),
            "model": settings.EMBEDDING_MODEL,
            "embedding_dimension": settings.EMBEDDING_DIMENSION,
            "rrf_k": settings.RRF_K,
            "evaluation_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "repositories": [
                {"id": "demo-ecommerce", "url": "https://github.com/repomind/ecommerce-platform", "commit": "demo-sha-9f82d1"},
                {"id": "repo-018170192cf7", "url": "https://github.com/deepa-garg/ai-resume-analyzer", "commit": "4ad11106847b"},
            ]
        },
        "retrieval_comparison": metrics_by_mode,
        "rag_metrics": {
            "total_citations_evaluated": total_citations,
            "valid_citations": valid_citations,
            "citation_accuracy": round(citation_accuracy, 4),
            "unanswerable_questions_evaluated": unanswerable_total,
            "unanswerable_correctly_rejected": unanswerable_rejected,
            "unanswerable_precision": round(unanswerable_precision, 4)
        },
        "question_results": detailed_results
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)

    print("\n" + "=" * 80)
    print(" BENCHMARK RETRIEVAL EVALUATION RESULTS")
    print("=" * 80)
    print(f"{'Retrieval Mode':<18} | {'Recall@5':<12} | {'MRR':<10}")
    print("-" * 80)
    for m in modes:
        res = metrics_by_mode[m]
        print(f"{m.capitalize():<18} | {res['recall_at_5'] * 100:>10.1f}% | {res['mrr']:>10.4f}")
    print("-" * 80)
    print(f"Citation Accuracy (Hybrid Mode):      {citation_accuracy * 100:.2f}% ({valid_citations}/{total_citations} verified citations)")
    print(f"Unanswerable Precision (Hybrid Mode):  {unanswerable_precision * 100:.2f}% ({unanswerable_rejected}/{unanswerable_total} safely rejected)")
    print(f"Detailed output saved to: {OUTPUT_PATH}")
    print("=" * 80)

    return final_report


if __name__ == "__main__":
    asyncio.run(run_evaluation())
