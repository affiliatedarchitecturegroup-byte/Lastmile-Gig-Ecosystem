FROM python:3.12-slim-bookworm AS deps

WORKDIR /app
RUN pip install --no-cache-dir pip setuptools wheel
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

FROM python:3.12-slim-bookworm

WORKDIR /app
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY src/ src/

RUN groupadd -r lmg && useradd -r -g lmg lmg
USER lmg

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8001/health'); r.raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
