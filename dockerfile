# Usa uma versão leve do Python
FROM python:3.11-slim

# Instala o motor do Tesseract OCR e o pacote de idioma Português no sistema Linux
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Define a pasta de trabalho
WORKDIR /app

# Copia e instala as bibliotecas do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código para dentro do servidor
COPY . .

# Expõe a porta e liga o servidor FastAPI
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
