import os
import secrets

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from rules import MASTERY_PCT, check_levels, compute_coins

ENGINE_KEY = os.getenv("ENGINE_KEY", "dev-engine-key")

app = FastAPI(title="SNED Rule Engine")


def require_key(x_engine_key: str = Header(default="")):
    if not secrets.compare_digest(x_engine_key, ENGINE_KEY):
        raise HTTPException(status_code=401, detail="Bad engine key")


class ScoreIn(BaseModel):
    score: int = Field(ge=0, le=100)
    best_before: int = Field(ge=0, le=100)


class LessonIn(BaseModel):
    lesson_id: int
    level_no: int = Field(ge=1)
    completion_pct: float = Field(ge=0, le=100)


class LevelsIn(BaseModel):
    lessons: list[LessonIn]
    mastery_pct: float = Field(default=MASTERY_PCT, ge=1, le=100)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", dependencies=[Depends(require_key)])
def score(body: ScoreIn):
    coins, applied = compute_coins(body.score, body.best_before)
    return {"coins": coins, "rules_applied": applied}


@app.post("/levels", dependencies=[Depends(require_key)])
def levels(body: LevelsIn):
    return check_levels([l.model_dump() for l in body.lessons], body.mastery_pct)