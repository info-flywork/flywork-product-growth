import uvicorn

if __name__ == "__main__":
    print("Panel: http://127.0.0.1:8787", flush=True)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8787)
