import os
import uvicorn
from api_server import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("REAV_API_PORT", "8765")),
        reload=False,
        workers=1,
    )
