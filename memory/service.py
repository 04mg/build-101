"""Cruce network memory: Graphiti + FalkorDB behind a private localhost HTTP API.

The Node agent service projects each founder's problem, pain points and
hypotheses (with their validation result) into one shared graph, searches it
for other founders' notes and records the AI-confirmed matches, contacts and
connections as relations. Only the agent service talks to this API; it binds
to 127.0.0.1 and never returns owner identities to browsers.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import math
import os
import re
import sys
import threading
import unicodedata
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import NAMESPACE_URL, uuid5

from graphiti_core import Graphiti
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.edges import EntityEdge
from graphiti_core.embedder.client import EmbedderClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.nodes import EntityNode
from graphiti_core.search.search_config_recipes import COMBINED_HYBRID_SEARCH_RRF

from cli import load_app_env

GROUP_ID = "cruce_network"
DIMENSIONS = 1024
LABELS = {"problem": "Problem", "segment": "Segment", "impact": "PainPoint", "hypothesis": "Hypothesis", "insight": "Insight"}
# Relation from a project to each kind of note; hypotheses depend on their result.
RELATIONS = {"problem": "ATTACKS", "segment": "SERVES", "impact": "FEELS", "insight": "LEARNED"}
HYPOTHESIS_RELATIONS = {"validated": "VALIDATED", "rejected": "INVALIDATED", "testing": "TESTS"}
RESOLVED = {"validated", "rejected"}
LINK_TYPES = {"SAME_PROBLEM", "SAME_HYPOTHESIS", "PARTNERSHIP_FIT", "CONTACTED", "CONNECTED"}


class LocalHashEmbedder(EmbedderClient):
    """Deterministic multilingual-ish embedding from words, stems and trigrams.

    Used when no embedding API is configured, so matching works offline; the
    agent's Claude judge reranks and rejects weak candidates afterwards.
    """

    async def create(self, input_data) -> list[float]:
        text = input_data if isinstance(input_data, str) else " ".join(map(str, input_data))
        return embed_text(text)

    async def create_batch(self, input_data_list: list[str]) -> list[list[float]]:
        return [embed_text(text) for text in input_data_list]


STOPWORDS = set("""a al algo ante con contra cual cuando de del desde donde e el ella ellas ellos en entre era es esa ese eso esta este esto
estos estas fue ha hay la las le les lo los mas me mi mis muy ni no nos o otra otro para pero por porque que quien se ser si sin
sobre su sus tambien te tiene tienen todo tu un una uno unos y ya the of and to in for on with is are""".split())


def embed_text(text: str) -> list[float]:
    normalized = unicodedata.normalize("NFKD", text.lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    words = [word for word in re.findall(r"[a-z0-9]+", normalized) if len(word) > 2 and word not in STOPWORDS]
    features: list[tuple[str, float]] = []
    for word in words:
        features.append((f"w:{word}", 1.0))
        features.append((f"s:{word[:5]}", 1.4))
        padded = f"#{word}#"
        features.extend((f"t:{padded[i:i + 3]}", 0.35) for i in range(len(padded) - 2))
    features.extend((f"b:{left[:5]}_{right[:5]}", 0.8) for left, right in zip(words, words[1:]))
    vector = [0.0] * DIMENSIONS
    for feature, weight in features:
        digest = hashlib.blake2b(feature.encode(), digest_size=8).digest()
        index = int.from_bytes(digest[:4], "little") % DIMENSIONS
        vector[index] += weight if digest[4] & 1 else -weight
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def builder_weight(note: dict) -> float:
    """For "who is working on this now": open problems and hypotheses under test count
    more than results already closed."""
    if note["kind"] in ("problem", "segment", "impact"):
        return 1.3
    return 1.2 if note["status"] == "testing" else 0.8


def note_weight(note: dict) -> float:
    """How much a matching note counts: a resolved result weighs more than an open one,
    and each survey response or interview behind it adds weight, with diminishing returns."""
    return (1.5 if note["status"] in RESOLVED else 1.0) * (1 + math.log2(1 + max(0, int(note["evidence"]))) / 2)


def stable_uuid(*parts: object) -> str:
    return str(uuid5(NAMESPACE_URL, "cruce-network:" + ":".join(map(str, parts))))


class Memory:
    def __init__(self) -> None:
        api_key = os.getenv("AI_API_KEY", "").strip()
        base_url = os.getenv("AI_BASE_URL", "https://openrouter.ai/api/v1").strip().rstrip("/")
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if api_key:
            self.embedder: EmbedderClient = OpenAIEmbedder(config=OpenAIEmbedderConfig(
                api_key=api_key, base_url=base_url, embedding_model="liquid/lfm-2.5-embedding-350m:free", embedding_dim=DIMENSIONS))
            self.embedder_name = "openrouter"
        elif openai_key:
            # The same key as GPT-Realtime and the experience library. Graphiti keeps the first
            # DIMENSIONS values, which text-embedding-3 supports; cosine ignores the norm.
            self.embedder = OpenAIEmbedder(config=OpenAIEmbedderConfig(
                api_key=openai_key, embedding_model="text-embedding-3-small", embedding_dim=DIMENSIONS))
            self.embedder_name = "openai"
        else:
            self.embedder = LocalHashEmbedder()
            self.embedder_name = "local"
        # Vectors from different embedders are not comparable, so each gets its own
        # graph. Graphiti's FalkorDB driver searches the graph named after the group.
        self.graph = f"{GROUP_ID}_{self.embedder_name}"
        self.driver = FalkorDriver(host=os.getenv("FALKORDB_HOST", "localhost"), port=int(os.getenv("FALKORDB_PORT", "6379")),
                                   password=os.getenv("FALKORDB_PASSWORD") or None, database=self.graph)
        # Nodes and relations are written directly, never extracted by an LLM, and
        # RRF search needs no reranker: these clients exist only to satisfy Graphiti.
        llm_config = LLMConfig(api_key=api_key or "unused", model="unused", small_model="unused", base_url=base_url)
        llm_client = OpenAIGenericClient(config=llm_config)
        self.graphiti = Graphiti(graph_driver=self.driver, llm_client=llm_client, embedder=self.embedder,
                                 cross_encoder=OpenAIRerankerClient(client=llm_client, config=llm_config))
        # Every founder note with its embedding, for /match; rebuilt after any write.
        self.notes: list[dict] | None = None

    async def start(self) -> None:
        await self.graphiti.build_indices_and_constraints()

    async def query(self, cypher: str, **params):
        records, _, _ = await self.driver.execute_query(cypher, **params)
        return records

    async def save_node(self, node: EntityNode) -> None:
        await node.generate_name_embedding(self.embedder)
        await node.save(self.driver)

    async def save_edge(self, edge: EntityEdge) -> None:
        await edge.generate_embedding(self.embedder)
        await edge.save(self.driver)

    async def upsert(self, body: dict) -> dict:
        owner, project_id = str(body["owner"]), int(body["projectId"])
        self.notes = None
        now = datetime.now(timezone.utc)
        founder = EntityNode(uuid=stable_uuid("founder", owner), name="Founder de la red", group_id=self.graph, labels=["Founder"],
                             summary="Emprendedor anónimo de Cruce.", created_at=now, attributes={"owner": owner, "open_to_intro": True})
        problem_text = next((note["body"] for note in body["notes"] if note["kind"] == "problem"), "")
        project = EntityNode(uuid=stable_uuid("project", owner, project_id), name=str(body["name"])[:180], group_id=self.graph,
                             labels=["Project"], summary=problem_text[:1500], created_at=now,
                             attributes={"owner": owner, "project_id": project_id})
        await self.save_node(founder)
        await self.save_node(project)
        await self.save_edge(EntityEdge(uuid=stable_uuid("works-on", owner, project_id), name="WORKS_ON", group_id=self.graph,
                                        source_node_uuid=founder.uuid, target_node_uuid=project.uuid, created_at=now, valid_at=now,
                                        fact=f"Un founder trabaja en un proyecto sobre: {problem_text[:400]}"))
        keep = [founder.uuid, project.uuid]
        for note in body["notes"][:40]:
            kind = note["kind"]
            if kind not in LABELS:
                continue
            status = note.get("status", "open")
            uuid = stable_uuid("note", owner, project_id, note["id"])
            keep.append(uuid)
            text = f"{note['title']}: {note['body']}" if note.get("title") else note["body"]
            await self.save_node(EntityNode(uuid=uuid, name=text[:500], group_id=self.graph, labels=[LABELS[kind]],
                                            summary=note["body"][:2000], created_at=now,
                                            attributes={"owner": owner, "project_id": project_id, "note_id": note["id"], "kind": kind,
                                                        "title": note.get("title", "")[:180], "status": status,
                                                        "evidence": int(note.get("evidence", 0))}))
            relation = HYPOTHESIS_RELATIONS.get(status, "TESTS") if kind == "hypothesis" else RELATIONS[kind]
            fact = {"VALIDATED": "Un founder validó con evidencia la hipótesis", "INVALIDATED": "Un founder dio por no validada la hipótesis",
                    "TESTS": "Un founder está probando la hipótesis", "ATTACKS": "Un founder ataca el problema",
                    "SERVES": "Un founder apunta al segmento", "FEELS": "Un founder trabaja sobre el pain point",
                    "LEARNED": "Un founder aprendió que"}[relation]
            # A changed result is a different relation: drop the previous one first.
            await self.query("MATCH (:Entity {uuid: $source})-[e:RELATES_TO]->(:Entity {uuid: $target}) WHERE e.name <> $name DELETE e",
                             source=project.uuid, target=uuid, name=relation)
            await self.save_edge(EntityEdge(uuid=stable_uuid("has", owner, project_id, note["id"], relation), name=relation, group_id=self.graph,
                                            source_node_uuid=project.uuid, target_node_uuid=uuid, created_at=now, valid_at=now,
                                            fact=f"{fact}: {note['body'][:600]}", attributes={"owner": owner, "project_id": project_id}))
        await self.query("MATCH (n:Entity) WHERE n.group_id = $group AND n.owner = $owner AND n.project_id = $project AND NOT n.uuid IN $keep DETACH DELETE n",
                         group=self.graph, owner=owner, project=project_id, keep=keep)
        return {"ok": True, "graph": self.graph, "notes": len(keep) - 2}

    async def remove(self, body: dict) -> dict:
        self.notes = None
        await self.query("MATCH (n:Entity) WHERE n.group_id = $group AND n.owner = $owner AND n.project_id = $project DETACH DELETE n",
                         group=self.graph, owner=str(body["owner"]), project=int(body["projectId"]))
        # A founder without projects left has nothing to match on.
        await self.query("MATCH (f:Founder) WHERE f.group_id = $group AND f.owner = $owner AND NOT (f)-[:RELATES_TO]->(:Project) DETACH DELETE f",
                         group=self.graph, owner=str(body["owner"]))
        return {"ok": True}

    async def search(self, body: dict) -> dict:
        owner, limit = str(body["owner"]), int(body.get("limit", 6))
        candidates: dict[tuple, dict] = {}
        for query in body["queries"][:12]:
            text = str(query["text"]).strip()[:1200]
            if len(text) < 8:
                continue
            results = await self.graphiti.search_(query=text, config=COMBINED_HYBRID_SEARCH_RRF, group_ids=[self.graph])
            hits: list[tuple[str, str]] = [(node.uuid, "") for node in results.nodes]
            hits += [(edge.target_node_uuid, edge.fact) for edge in results.edges if edge.name in RELATIONS.values() or edge.name in HYPOTHESIS_RELATIONS.values()]
            found = 0
            for rank, (uuid, fact) in enumerate(hits):
                note = await self.note(uuid)
                if not note or note["owner"] == owner:
                    continue
                key = (query["noteId"], note["owner"], note["projectId"], note["noteId"])
                score = note_weight(note) / (rank + 1)
                if key in candidates:
                    candidates[key]["score"] += score
                    continue
                candidates[key] = {"queryNoteId": query["noteId"], "queryKind": query.get("kind"), "score": score, "fact": fact, "other": note}
                found += 1
                if found >= limit:
                    break
        ranked = sorted(candidates.values(), key=lambda candidate: -candidate["score"])
        return {"candidates": ranked[: int(body.get("max", 24))]}

    async def match(self, body: dict) -> dict:
        """The question's best note per founder project, without Graphiti search or an LLM:
        cosine against the stored note embeddings, kept in memory, times the note's weight.
        intent "learning" favors resolved results with evidence; "builder" favors who is
        working on it now. Notes below min_similarity are not related to the question."""
        owner, text = str(body["owner"]), str(body["text"]).strip()[:1200]
        exclude = {int(project) for project in body.get("excludeProjects", [])}
        weigh = builder_weight if body.get("intent") == "builder" else note_weight
        threshold, limit = float(body.get("minSimilarity", 0.2)), int(body.get("limit", 3))
        if self.notes is None:
            records = await self.query("MATCH (n:Entity) WHERE n.group_id = $group AND n.note_id IS NOT NULL RETURN n.owner AS owner, n.project_id AS project_id, "
                                       "n.note_id AS note_id, n.kind AS kind, n.title AS title, n.summary AS body, n.status AS status, n.evidence AS evidence, "
                                       "n.name_embedding AS embedding", group=self.graph)
            self.notes = [{"owner": r["owner"], "projectId": r["project_id"], "noteId": r["note_id"], "kind": r["kind"], "title": r["title"] or "",
                           "body": r["body"] or "", "status": r["status"] or "open", "evidence": r["evidence"] or 0, "embedding": list(r["embedding"] or [])}
                          for r in records]
        vector = await self.embedder.create(text) if len(text) >= 8 else []
        best: dict[int, dict] = {}
        for note in self.notes:
            if note["owner"] == owner or note["projectId"] in exclude or not note["embedding"] or not vector:
                continue
            similarity = cosine(vector, note["embedding"])
            if similarity < threshold:
                continue
            score = similarity * weigh(note)
            if score > best.get(note["projectId"], {}).get("score", 0):
                best[note["projectId"]] = {**{k: v for k, v in note.items() if k != "embedding"}, "similarity": round(similarity, 3), "score": round(score, 3)}
        return {"matches": sorted(best.values(), key=lambda m: -m["score"])[:limit]}

    async def note(self, uuid: str) -> dict | None:
        records = await self.query("MATCH (n:Entity {uuid: $uuid}) WHERE n.note_id IS NOT NULL RETURN n.owner AS owner, n.project_id AS project_id, "
                                   "n.note_id AS note_id, n.kind AS kind, n.title AS title, n.summary AS body, n.status AS status, n.evidence AS evidence", uuid=uuid)
        if not records:
            return None
        record = records[0]
        return {"owner": record["owner"], "projectId": record["project_id"], "noteId": record["note_id"], "kind": record["kind"],
                "title": record["title"] or "", "body": record["body"] or "", "status": record["status"] or "open", "evidence": record["evidence"] or 0}

    async def link(self, body: dict) -> dict:
        kind = str(body["type"])
        if kind not in LINK_TYPES:
            raise ValueError("Tipo de relación inválido.")
        source, target = body["from"], body["to"]
        now = datetime.now(timezone.utc)
        await self.save_edge(EntityEdge(
            uuid=stable_uuid("link", kind, source["owner"], source["projectId"], target["owner"], target["projectId"], body.get("key", "")),
            name=kind, group_id=self.graph, created_at=now, valid_at=now, fact=str(body["fact"])[:900],
            source_node_uuid=stable_uuid("project", source["owner"], int(source["projectId"])),
            target_node_uuid=stable_uuid("project", target["owner"], int(target["projectId"])),
            attributes={"source_note": source.get("noteId", ""), "target_note": target.get("noteId", "")}))
        return {"ok": True}

    async def reset(self, _body: dict) -> dict:
        """Empties the network graph; used by the seed script to leave a clean base."""
        self.notes = None
        await self.query("MATCH (n:Entity) WHERE n.group_id = $group DETACH DELETE n", group=self.graph)
        return {"ok": True, "graph": self.graph}

    async def health(self) -> dict:
        await self.query("RETURN 1 AS ok")
        return {"status": "ok", "graph": self.graph, "embedder": self.embedder_name}


def serve(port: int) -> None:
    loop = asyncio.new_event_loop()
    threading.Thread(target=loop.run_forever, daemon=True).start()
    memory = Memory()
    asyncio.run_coroutine_threadsafe(memory.start(), loop).result(timeout=60)
    routes = {("GET", "/health"): lambda _body: memory.health(), ("POST", "/projects/upsert"): memory.upsert,
              ("POST", "/projects/remove"): memory.remove, ("POST", "/search"): memory.search, ("POST", "/match"): memory.match, ("POST", "/links"): memory.link,
              ("POST", "/reset"): memory.reset}

    class Handler(BaseHTTPRequestHandler):
        def handle_route(self, method: str) -> None:
            route = routes.get((method, self.path.split("?")[0]))
            status, payload = 404, {"error": "Ruta desconocida."}
            if route:
                try:
                    length = int(self.headers.get("Content-Length") or 0)
                    body = json.loads(self.rfile.read(length) or b"{}") if method == "POST" else {}
                    payload = asyncio.run_coroutine_threadsafe(route(body), loop).result(timeout=120)
                    status = 200
                except (KeyError, TypeError, ValueError) as error:
                    status, payload = 400, {"error": f"Solicitud inválida: {error}"}
                except Exception as error:  # Reported to the agent without request contents.
                    print(f"Memory request failed: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
                    status, payload = 500, {"error": "La memoria no pudo completar la operación."}
            data = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:
            self.handle_route("GET")

        def do_POST(self) -> None:
            self.handle_route("POST")

        def log_message(self, *_args) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Cruce memory: http://127.0.0.1:{port} · graph {memory.graph} · embeddings {memory.embedder_name}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    load_app_env()
    serve(int(os.getenv("MEMORY_PORT", "4010")))
