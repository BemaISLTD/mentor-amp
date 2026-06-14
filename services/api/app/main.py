from fastapi import FastAPI

app = FastAPI(
    title="Mentor AMP API",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "Mentor AMP",
        "version": "0.1.0",
    }
