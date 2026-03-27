FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry

COPY pyproject.toml poetry.toml poetry.lock* ./

RUN poetry install --no-root --no-interaction

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
