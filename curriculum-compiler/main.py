from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

import firebase_admin
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth
from google.cloud import storage
from pydantic import BaseModel, Field

from compiler import CurriculumCompileError, CurriculumCompiler, EXPECTED_RELEASE_ID, SUPPORTED_SUBSTEPS


class CompileRequest(BaseModel):
    groupId: str
    groupName: str = ""
    currentSubstep: str
    lessonFocus: str = ""
    lessonPath: str = "full"
    conceptsToWeave: list[str] = Field(default_factory=list)
    troubleSpots: list[str] = Field(default_factory=list)
    unmasteredPriorHighFrequencyWords: list[str] = Field(default_factory=list)
    currentCardRepository: list[str] = Field(default_factory=list)
    reviewCardRepository: list[str] = Field(default_factory=list)
    practicedWordElements: list[str] = Field(default_factory=list)
    highFrequencyWords: list[str] = Field(default_factory=list)
    nextLessonNotes: str = ""


def _download_gcs_database(uri: str) -> Path:
    parsed = urlparse(uri)
    if parsed.scheme != "gs" or not parsed.netloc or not parsed.path.lstrip("/"):
        raise RuntimeError("WRS_DATABASE_GCS_URI must look like gs://bucket/path/to/database.sqlite")
    destination = Path("/tmp/WRS_Curriculum_Release_1.0.1.sqlite")
    client = storage.Client()
    client.bucket(parsed.netloc).blob(parsed.path.lstrip("/")).download_to_filename(destination)
    return destination


def _database_path() -> Path:
    local = os.getenv("WRS_DATABASE_PATH", "").strip()
    if local:
        return Path(local)
    gcs_uri = os.getenv("WRS_DATABASE_GCS_URI", "").strip()
    if gcs_uri:
        return _download_gcs_database(gcs_uri)
    raise RuntimeError("Set WRS_DATABASE_PATH or WRS_DATABASE_GCS_URI.")


if not firebase_admin._apps:
    firebase_admin.initialize_app()

compiler = CurriculumCompiler(
    _database_path(),
    expected_release_id=os.getenv("EXPECTED_RELEASE_ID", EXPECTED_RELEASE_ID),
)

app = FastAPI(title="WRS Curriculum Compiler", version="0.1.0")
allowed_origins = [
    item.strip()
    for item in os.getenv("ALLOWED_ORIGINS", "https://wrs-firebase.web.app").split(",")
    if item.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


async def _verify_teacher(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "auth_required", "message": "Firebase teacher sign-in is required."})
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return auth.verify_id_token(token, check_revoked=True)
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "auth_invalid", "message": "Firebase teacher token could not be verified."})


@app.exception_handler(CurriculumCompileError)
async def compile_error_handler(_: Request, exc: CurriculumCompileError):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=exc.status_code, content={"detail": {"code": exc.code, "message": str(exc)}})


@app.get("/healthz")
def healthz():
    return {
        "ok": True,
        "releaseId": compiler.expected_release_id,
        "supportedSubsteps": sorted(SUPPORTED_SUBSTEPS),
    }


@app.post("/v1/lessons/compile")
async def compile_lesson(payload: CompileRequest, authorization: str | None = Header(default=None)):
    decoded = await _verify_teacher(authorization)
    runtime = compiler.compile(payload.model_dump())
    return {
        "runtimePlan": runtime,
        "compiler": {
            "version": "0.1.0",
            "teacherUid": decoded.get("uid"),
            "releaseId": compiler.expected_release_id,
        },
    }
