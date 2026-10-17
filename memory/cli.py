from __future__ import annotations

import argparse
import asyncio
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from graphiti_core import Graphiti
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.edges import EntityEdge
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.nodes import EntityNode
from graphiti_core.search.search_config_recipes import COMBINED_HYBRID_SEARCH_RRF


GROUP_ID = "cruce_network_poc"
GRAPH_NAME = GROUP_ID
EMBEDDING_MODEL = "liquid/lfm-2.5-embedding-350m:free"
EMBEDDING_DIMENSIONS = 1024


@dataclass(frozen=True)
class MockPerson:
    key: str
    name: str
    stage: str
    problem: str
    approach: str
    outcome: str
    open_to_intro: bool

    @property
    def summary(self) -> str:
        return f"{self.problem} Probó {self.approach}. Resultado: {self.outcome}."


MOCK_PEOPLE = (
    MockPerson(
        key="martina-lopez",
        name="Martina López",
        stage="Pivotó y consiguió sus primeros clientes",
        problem="Desperdicio de alimentos en restaurantes independientes por compras excesivas y datos incompletos de ventas e inventario",
        approach="predicción de compras con inteligencia artificial; después pivotó a un registro diario de mermas",
        outcome="descubrió que muchos restaurantes no tenían datos confiables para alimentar predicciones",
        open_to_intro=True,
    ),
    MockPerson(
        key="valentina-costa",
        name="Valentina Costa",
        stage="Primeros clientes pagos",
        problem="Excedentes de comida al cierre en restaurantes y panaderías que terminaban descartados",
        approach="conectar comercios con compradores cercanos para vender excedentes del día",
        outcome="validó ventas locales con operación manual antes de automatizar",
        open_to_intro=True,
    ),
    MockPerson(
        key="santiago-ruiz",
        name="Santiago Ruiz",
        stage="Validando el problema",
        problem="Encargados de restaurantes pequeños deciden cuánto comprar por intuición y les cuesta registrar inventario",
        approach="entrevistas sobre compras, planillas simples y seguimiento semanal de desperdicios",
        outcome="encontró diferencias entre lo que los fundadores creen y lo que los encargados hacen realmente",
        open_to_intro=True,
    ),
    MockPerson(
        key="lucia-mendez",
        name="Lucía Méndez",
        stage="Experiencia operativa en restaurantes",
        problem="Restaurantes descartan ingredientes frescos por errores de compra y falta de control de stock",
        approach="procesos internos de inventario y planificación de compras",
        outcome="prefiere no recibir presentaciones de otros founders por ahora",
        open_to_intro=False,
    ),
)


def load_app_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        raise RuntimeError(f"No encontré el archivo esperado: {env_path}")

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, value = line.partition("=")
        if not separator:
            continue
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        if key and key not in os.environ:
            os.environ[key] = value


def stable_uuid(kind: str, key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"cruce-memory-poc:{GROUP_ID}:{kind}:{key}"))


def make_clients() -> tuple[Graphiti, FalkorDriver, OpenAIEmbedder]:
    api_key = os.getenv("AI_API_KEY", "").strip()
    base_url = os.getenv("AI_BASE_URL", "https://openrouter.ai/api/v1").strip().rstrip("/")
    llm_model = os.getenv("AI_MODEL", "liquid/lfm-2.5-2.6b:free").strip()
    if not api_key:
        raise RuntimeError("AI_API_KEY no está configurada en app/.env")

    llm_config = LLMConfig(
        api_key=api_key,
        model=llm_model,
        small_model=llm_model,
        base_url=base_url,
    )
    llm_client = OpenAIGenericClient(config=llm_config)
    embedder = OpenAIEmbedder(
        config=OpenAIEmbedderConfig(
            api_key=api_key,
            base_url=base_url,
            embedding_model=EMBEDDING_MODEL,
            embedding_dim=EMBEDDING_DIMENSIONS,
        )
    )
    driver = FalkorDriver(
        host=os.getenv("FALKORDB_HOST", "localhost"),
        port=int(os.getenv("FALKORDB_PORT", "6379")),
        password=os.getenv("FALKORDB_PASSWORD") or None,
        database=GRAPH_NAME,
    )
    cross_encoder = OpenAIRerankerClient(client=llm_client, config=llm_config)
    graphiti = Graphiti(
        graph_driver=driver,
        llm_client=llm_client,
        embedder=embedder,
        cross_encoder=cross_encoder,
    )
    return graphiti, driver, embedder


async def ensure_graph(graphiti: Graphiti) -> None:
    await graphiti.build_indices_and_constraints()


async def save_node(driver: FalkorDriver, embedder: OpenAIEmbedder, node: EntityNode) -> None:
    await node.generate_name_embedding(embedder)
    await node.save(driver)


async def save_edge(driver: FalkorDriver, embedder: OpenAIEmbedder, edge: EntityEdge) -> None:
    await edge.generate_embedding(embedder)
    await edge.save(driver)


async def seed(graphiti: Graphiti, driver: FalkorDriver, embedder: OpenAIEmbedder) -> None:
    now = datetime.now(timezone.utc)
    problems = {
        "restaurant-waste": EntityNode(
            uuid=stable_uuid("problem", "restaurant-waste"),
            name="Desperdicio de alimentos en restaurantes pequeños",
            group_id=GROUP_ID,
            labels=["Problem"],
            summary="Ingredientes que se compran de más, se vencen o se descartan al final del día.",
            created_at=now,
            attributes={"mock": True},
        ),
        "purchase-data": EntityNode(
            uuid=stable_uuid("problem", "purchase-data"),
            name="Datos incompletos para planificar compras",
            group_id=GROUP_ID,
            labels=["Problem"],
            summary="Ventas, inventario y mermas no se registran de forma consistente en pequeños negocios.",
            created_at=now,
            attributes={"mock": True},
        ),
    }
    approaches = {
        "forecasting": EntityNode(
            uuid=stable_uuid("approach", "forecasting"),
            name="Predicción de compras con IA",
            group_id=GROUP_ID,
            labels=["Approach"],
            summary="Predecir cuánto comprar usando ventas e inventario históricos.",
            created_at=now,
            attributes={"mock": True},
        ),
        "surplus-market": EntityNode(
            uuid=stable_uuid("approach", "surplus-market"),
            name="Reventa local de excedentes del día",
            group_id=GROUP_ID,
            labels=["Approach"],
            summary="Conectar comercios con excedentes de comida con compradores cercanos.",
            created_at=now,
            attributes={"mock": True},
        ),
        "manual-log": EntityNode(
            uuid=stable_uuid("approach", "manual-log"),
            name="Registro manual de inventario y mermas",
            group_id=GROUP_ID,
            labels=["Approach"],
            summary="Registrar compras, inventario y desperdicio con una rutina simple.",
            created_at=now,
            attributes={"mock": True},
        ),
    }
    people = {
        person.key: EntityNode(
            uuid=stable_uuid("person", person.key),
            name=person.name,
            group_id=GROUP_ID,
            labels=["Person"],
            summary=person.summary,
            created_at=now,
            attributes={
                "stage": person.stage,
                "open_to_intro": person.open_to_intro,
                "mock": True,
            },
        )
        for person in MOCK_PEOPLE
    }

    for node in [*problems.values(), *approaches.values(), *people.values()]:
        await save_node(driver, embedder, node)

    relations: list[tuple[str, EntityNode, EntityNode, str]] = []
    problem_for_person = {
        "martina-lopez": "restaurant-waste",
        "valentina-costa": "restaurant-waste",
        "santiago-ruiz": "purchase-data",
        "lucia-mendez": "restaurant-waste",
    }
    approach_for_person = {
        "martina-lopez": "forecasting",
        "valentina-costa": "surplus-market",
        "santiago-ruiz": "manual-log",
        "lucia-mendez": "manual-log",
    }
    for person in MOCK_PEOPLE:
        profile_node = people[person.key]
        problem_node = problems[problem_for_person[person.key]]
        approach_node = approaches[approach_for_person[person.key]]
        relations.append((f"experienced:{person.key}", profile_node, problem_node,
                          f"{person.name} vivió este problema: {person.problem}."))
        relations.append((f"tried:{person.key}", profile_node, approach_node,
                          f"{person.name} probó {person.approach}; {person.outcome}."))

    for key, source, target, fact in relations:
        edge = EntityEdge(
            uuid=stable_uuid("edge", key),
            name="EXPERIENCED" if key.startswith("experienced:") else "TRIED",
            fact=fact,
            group_id=GROUP_ID,
            source_node_uuid=source.uuid,
            target_node_uuid=target.uuid,
            created_at=now,
            valid_at=now,
        )
        await save_edge(driver, embedder, edge)

    print(f"Grafo mock listo: {len(MOCK_PEOPLE)} perfiles, {len(problems)} problemas y {len(relations)} relaciones.")


def profile_rankings(results) -> tuple[list[tuple[MockPerson, int, list[str]]], set[str]]:
    profile_by_uuid = {stable_uuid("person", person.key): person for person in MOCK_PEOPLE}
    ranks: dict[str, int] = {}
    evidence: dict[str, list[str]] = {}

    for index, node in enumerate(results.nodes):
        if node.uuid in profile_by_uuid:
            ranks[node.uuid] = min(ranks.get(node.uuid, index), index)

    for index, edge in enumerate(results.edges):
        for person_uuid in (edge.source_node_uuid, edge.target_node_uuid):
            if person_uuid in profile_by_uuid:
                ranks[person_uuid] = min(ranks.get(person_uuid, index), index)
                evidence.setdefault(person_uuid, []).append(edge.fact)

    ranked = [
        (profile_by_uuid[person_uuid], rank, evidence.get(person_uuid, []))
        for person_uuid, rank in ranks.items()
    ]
    ranked.sort(key=lambda result: result[1])
    retrieved = set(ranks)
    return ranked, retrieved


async def match(graphiti: Graphiti, query: str, request_first: bool = False) -> list[MockPerson]:
    results = await graphiti.search_(
        query=query,
        config=COMBINED_HYBRID_SEARCH_RRF,
        group_ids=[GROUP_ID],
    )
    ranked, retrieved_ids = profile_rankings(results)
    eligible = [(person, rank, facts) for person, rank, facts in ranked if person.open_to_intro]
    excluded = sum(1 for person in MOCK_PEOPLE
                   if not person.open_to_intro and stable_uuid("person", person.key) in retrieved_ids)

    print(f"\nBúsqueda Graphiti: {len(results.nodes)} nodos y {len(results.edges)} relaciones relevantes.")
    if excluded:
        print(f"{excluded} perfil(es) no se muestran porque no aceptan presentaciones.")
    if not eligible:
        print("No encontré perfiles elegibles para presentar. Probá describir el problema o su contexto actual.")
        for edge in results.edges[:5]:
            print(f"  · {edge.fact}")
        return []

    print("\nPersonas que podrían ayudarte:")
    for index, (person, _rank, facts) in enumerate(eligible, start=1):
        print(f"\n{index}. {person.name} · {person.stage} · perfil ficticio")
        print(f"   Experiencia: {person.problem}.")
        print(f"   Qué probó: {person.approach}.")
        print(f"   Aprendizaje: {person.outcome}.")
        if facts:
            print(f"   Relación encontrada: {facts[0]}")
        print("   Acepta recibir solicitudes de presentación: sí")

    if request_first and eligible:
        person = eligible[0][0]
        print(f"\nSolicitud simulada para {person.name}. No se envió ningún mensaje.")
        print("La presentación real requeriría que ambas personas acepten.")
    elif sys.stdin.isatty():
        choice = input("\nNúmero de perfil para simular una solicitud (Enter para salir): ").strip()
        if choice.isdigit() and 1 <= int(choice) <= len(eligible):
            person = eligible[int(choice) - 1][0]
            print(f"\nSolicitud simulada para {person.name}. No se envió ningún mensaje.")
            print("La presentación real requeriría que ambas personas acepten.")
    return [person for person, _rank, _facts in eligible]


async def run(args: argparse.Namespace) -> None:
    load_app_env()
    graphiti, driver, embedder = make_clients()
    try:
        await ensure_graph(graphiti)
        if args.command == "doctor":
            await driver.execute_query("RETURN 1 AS ok")
            vector = await embedder.create("Prueba de embedding ficticia para cruce.")
            print("FalkorDB conectado.")
            print(f"OpenRouter embeddings disponible: {len(vector)} dimensiones ({EMBEDDING_MODEL}).")
            return

        if args.command in ("seed", "demo"):
            await seed(graphiti, driver, embedder)
        if args.command in ("match", "demo"):
            query = args.query or (
                "Estoy investigando desperdicio de alimentos en restaurantes pequeños. "
                "Me preocupa que una predicción de compras dependa de datos de ventas e inventario que no existen."
            )
            await match(graphiti, query, request_first=args.request_first)
    finally:
        await driver.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Prueba local de matching de founders con Graphiti + FalkorDB.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("doctor", help="Verifica FalkorDB y el modelo de embeddings.")
    subparsers.add_parser("seed", help="Inserta/actualiza las personas ficticias en el grafo.")
    match_parser = subparsers.add_parser("match", help="Busca perfiles para un problema.")
    match_parser.add_argument("query", nargs="?", help="Problema o experiencia que querés matchear.")
    match_parser.add_argument("--request-first", action="store_true", help="Simula pedir una presentación al primer match elegible.")
    demo_parser = subparsers.add_parser("demo", help="Siembra perfiles y ejecuta una búsqueda de ejemplo.")
    demo_parser.add_argument("--query", help="Usa una consulta de matching propia.")
    demo_parser.add_argument("--request-first", action="store_true", help="Simula pedir una presentación al primer match elegible.")
    args = parser.parse_args()
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        print("\nInterrumpido.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
