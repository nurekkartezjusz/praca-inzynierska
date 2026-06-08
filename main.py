import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import auth, friends, game_invitations, profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="Wielka Studencka Batalla", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://localhost:5501",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_API_PREFIX = "/api"
app.include_router(auth.router, prefix=_API_PREFIX)
app.include_router(profile.router, prefix=_API_PREFIX)
app.include_router(friends.router, prefix=_API_PREFIX)
app.include_router(game_invitations.router, prefix=_API_PREFIX)

# Serwowanie plików statycznych (frontend)
# Tabele bazy danych należy tworzyć przez migracje (np. Alembic), nie Base.metadata.create_all
app.mount("/", StaticFiles(directory=".", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


