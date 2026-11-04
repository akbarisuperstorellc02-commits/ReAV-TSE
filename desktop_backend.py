import os
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="127.0.0.1",
        port=int(os.environ.get("REAV_API_PORT", "8765")),
        reload=False,
        workers=1,
    )
