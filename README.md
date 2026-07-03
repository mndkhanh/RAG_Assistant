# Support-Docs RAG Assistant

A support-chatbot clone backed by a real Zendesk Help Center knowledge base.

## Setup

```bash
cd scraper
cp ../.env.sample ../.env
# fill in OPENAI_API_KEY at minimum
pip install -r requirements.txt
```

## Run locally

```bash
cd scraper
python main.py
```

Or via Docker:

```bash
cd scraper
docker build -t rag-assistant .
docker run --rm \
  -e OPENAI_API_KEY=sk-... \
  -e VECTOR_STORE_ID=vs_... \
  -v "$(pwd)/data:/app/data" \
  rag-assistant
```

## Daily job logs

https://optibot.mndkhanh.workers.dev/

## Sample answer

Prompt: "How do I add a YouTube video?"

![OpenAI Assistants Playground answering "How do I add a YouTube video?" with a numbered how-to and a link to the source article](submissions/ai-playground.png)

Prompt: "What is your business about?"

![ChatBot conversation](submissions/ai-playground-2.png)
