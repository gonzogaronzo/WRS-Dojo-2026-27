from __future__ import annotations

import hashlib
import os
import sqlite3
import tempfile
from pathlib import Path
from typing import Any, Literal

import firebase_admin
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tools.curriculum.compile_lesson import (
    CompileError,
    RELEASE_ID,
    compile_82,
    get_fixture,
    load_metadata,
    require_coverage,
    require_release,
)


class PlanningContext(BaseModel):
    conceptsToWeave: list[str] = Field(default_factory=list)
    troubleSpots: list[str] = Field(default_factory=list)
    nextLessonNotes: str = ""
    currentCardRepository: list[str] = Field(default_factory=list)
    reviewCardRepository: list[str] = Field(default_factory=list)
    practicedWordElements: list[str] = Field(default_factory=list)
    highFrequencyWords: list[str] = Field(default_factory=list)


class CompileRequest(BaseModel):
    groupId: str | None = None
    substep: str
    lessonFocus: Literal["introduction", "accuracy", "automaticity-fluency"] | None = None
    lessonPath: Literal["full", "block1+3", "block2+3"] = "full"
    planningContext: PlanningContext = Field(default_factory=PlanningContext)


class GeneratedFor(BaseModel):
    teacherUid: str
    groupId: str | None
    substep: str
    lessonFocus: str
    lessonPath: str


class CompileResponse(BaseModel):
    curriculumReleaseId: str
    generatedFor: GeneratedFor
    runtimeLesson: dict[str, Any]


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _allowed_origins() -> list[str]:
    raw = os.getenv("WRS_CURRICULUM_ALLOWED_ORIGINS", "https://wrs-firebase.web.app")
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


def _download_gcs_database(uri: str, destination: Path) -> None:
    if not uri.startswith("gs://"):
        raise RuntimeError("WRS_CURRICULUM_GCS_URI must start with gs://")
    from google.cloud import storage

    bucket_name, _, object_name = uri[5:].partition("/")
    if not bucket_name or not object_name:
        raise RuntimeError("WRS_CURRICULUM_GCS_URI must include bucket and object name")
    client = storage.Client()
    client.bucket(bucket_name).blob(object_name).download_to_filename(destination)


def _verify_sha256(path: Path) -> None:
    expected = os.getenv("WRS_CURRICULUM_DB_SHA256", "").strip().lower()
    if not expected:
        return
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        raise RuntimeError(
            f"Curriculum database checksum mismatch: expected {expected}, got {digest}"
        )


def resolve_database_path() -> Path:
    local = os.getenv("WRS_CURRICULUM_DB_PATH", "").strip()
    if local:
        path = Path(local)
        if not path.is_file():
            raise RuntimeError(f"WRS_CURRICULUM_DB_PATH does not exist: {path}")
        _verify_sha256(path)
        return path

    gcs_uri = os.getenv("WRS_CURRICULUM_GCS_URI", "").strip()
    if gcs_uri:
        destination = Path(tempfile.gettempdir()) / "WRS_Curriculum_Release_1.0.1.sqlite"
        if not destination.exists():
            _download_gcs_database(gcs_uri, destination)
        _verify_sha256(destination)
        return destination

    raise RuntimeError(
        "Set WRS_CURRICULUM_DB_PATH or WRS_CURRICULUM_GCS_URI; the curriculum database is intentionally not bundled with the browser app."
    )


def open_database() -> sqlite3.Connection:
    conn = sqlite3.connect(resolve_database_path())
    conn.row_factory = sqlite3.Row
    return conn


def _initialize_firebase_admin() -> None:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def _allowed_identity(decoded: dict[str, Any]) -> bool:
    allowed_uids = {
        item.strip() for item in os.getenv("WRS_CURRICULUM_ALLOWED_UIDS", "").split(",") if item.strip()
    }
    allowed_emails = {
        item.strip().lower() for item in os.getenv("WRS_CURRICULUM_ALLOWED_EMAILS", "").split(",") if item.strip()
    }
    if not allowed_uids and not allowed_emails:
        return True
    uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).lower()
    return uid in allowed_uids or email in allowed_emails


async def require_teacher(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    if _bool_env("WRS_CURRICULUM_ALLOW_UNAUTHENTICATED"):
        return {"uid": "local-development"}
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Firebase ID token required")

    token = authorization.split(" ", 1)[1].strip()
    try:
        _initialize_firebase_admin()
        from firebase_admin import auth

        decoded = auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token") from exc

    if not _allowed_identity(decoded):
        raise HTTPException(status_code=403, detail="Teacher account is not permitted to use the curriculum compiler")
    return decoded


def _path_parts(path: str) -> list[int]:
    if path == "block1+3":
        return [1, 2, 3, 4, 5, 9, 10]
    if path == "block2+3":
        return [6, 7, 8, 9, 10]
    return list(range(1, 11))


def _apply_instructional_context(runtime: dict[str, Any], request: CompileRequest) -> None:
    runtime["lessonPath"] = request.lessonPath
    runtime["plannedParts"] = _path_parts(request.lessonPath)

    context = request.planningContext
    runtime["planningContext"] = {
        "conceptsToWeave": "; ".join(context.conceptsToWeave),
        "troubleSpots": "; ".join(context.troubleSpots),
    }

    # Keep supplemental planning state outside Wilson source content. The current
    # wrs-runtime-v1 adapter does not persist every profile field, so these are
    # returned as request metadata rather than injected into source-controlled
    # lesson Parts.


def compile_request(request: CompileRequest, teacher_uid: str) -> CompileResponse:
    with open_database() as conn:
        try:
            require_release(conn)
            require_coverage(conn, request.substep)
            fixture = get_fixture(conn, request.substep)

            fixture_focus = str(fixture.get("lessonFocus", "")).strip().lower()
            requested_focus = request.lessonFocus or fixture_focus
            if requested_focus != fixture_focus:
                raise CompileError(
                    f"Automatic generation blocked for {request.substep}: Release 1.0.1 validates the golden fixture only for focus {fixture_focus!r}, not {requested_focus!r}."
                )

            runtime = compile_82(conn, fixture)
            runtime["focus"] = requested_focus
            _apply_instructional_context(runtime, request)
        except CompileError as exc:
            raise HTTPException(status_code=409, detail={"code": "coverage_gate", "message": str(exc)}) from exc

    return CompileResponse(
        curriculumReleaseId=RELEASE_ID,
        generatedFor=GeneratedFor(
            teacherUid=teacher_uid,
            groupId=request.groupId,
            substep=request.substep,
            lessonFocus=requested_focus,
            lessonPath=request.lessonPath,
        ),
        runtimeLesson=runtime,
    )


app = FastAPI(
    title="WRS Dojo Curriculum Compiler",
    version="0.1.0",
    docs_url=None if not _bool_env("WRS_CURRICULUM_ENABLE_DOCS") else "/docs",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        with open_database() as conn:
            require_release(conn)
            metadata = load_metadata(conn)
        return {
            "ok": True,
            "curriculumReleaseId": metadata.get("release_id"),
            "automaticFidelityPolicy": metadata.get("automatic_fidelity_policy"),
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/v1/coverage/{substep}")
def coverage(
    substep: str,
    teacher: dict[str, Any] = Depends(require_teacher),
) -> dict[str, Any]:
    del teacher
    with open_database() as conn:
        rows = conn.execute(
            """
            SELECT part_number, source_status, locator_status, automatic_fidelity_status, blocking_reason
            FROM coverage
            WHERE substep = ?
            ORDER BY part_number
            """,
            (substep,),
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Substep not found")
    return {
        "curriculumReleaseId": RELEASE_ID,
        "substep": substep,
        "parts": [dict(row) for row in rows],
    }


@app.post("/v1/lessons/compile", response_model=CompileResponse)
def compile_lesson_endpoint(
    request: CompileRequest,
    teacher: dict[str, Any] = Depends(require_teacher),
) -> CompileResponse:
    return compile_request(request, str(teacher.get("uid", "")))
