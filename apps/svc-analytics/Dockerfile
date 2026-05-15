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

EXPOSE 8002

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "4"]
