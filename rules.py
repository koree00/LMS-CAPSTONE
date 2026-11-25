POINTS_PER_COIN = 10
PERFECT_SCORE = 100
PERFECT_BONUS = 2
MASTERY_PCT = 80.0


def compute_coins(score: int, best_before: int):
    applied = []

    coins = max(0, score // POINTS_PER_COIN - best_before // POINTS_PER_COIN)
    if coins > 0:
        applied.append("improvement")

    if score >= PERFECT_SCORE and best_before < PERFECT_SCORE:
        coins += PERFECT_BONUS
        applied.append("perfect_bonus")

    return coins, applied


def check_levels(lessons, mastery_pct: float = MASTERY_PCT):
    by_level = {}
    for lesson in lessons:
        by_level.setdefault(lesson["level_no"], []).append(lesson["completion_pct"])

    levels = []
    for level_no in sorted(by_level):
        values = by_level[level_no]
        levels.append({
            "level_no": level_no,
            "lessons": len(values),
            "avg_completion": round(sum(values) / len(values), 2),
            "mastered": all(v >= mastery_pct for v in values),
        })

    current = next((lv["level_no"] for lv in levels if not lv["mastered"]), None)

    return {
        "mastery_pct": mastery_pct,
        "levels": levels,
        "current_level": current,
        "ready_for_next_level": bool(levels) and current is None,
    }