import httpx
from typing import List
from app.services.embeddings.base import BaseEmbeddingProvider
from app.core.config import settings

class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._dim = 768

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Using Gemini batchEmbedContents endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={self.api_key}"
        requests_payload = [
            {"model": "models/text-embedding-004", "content": {"parts": [{"text": t[:2000]}]}}
            for t in texts
        ]
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json={"requests": requests_payload})
                if res.status_code == 200:
                    data = res.json()
                    return [item["values"] for item in data.get("embeddings", [])]
        except Exception:
            pass
        # Fallback to local if remote call fails
        from app.services.embeddings.local_provider import LocalSemanticEmbeddingProvider
        return LocalSemanticEmbeddingProvider(dimension=self._dim).embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        res = self.embed_documents([text])
        return res[0] if res else [0.0] * self._dim

class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._dim = 1536

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        url = "https://api.openai.com/v1/embeddings"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, headers=headers, json={"input": texts, "model": "text-embedding-3-small"})
                if res.status_code == 200:
                    data = res.json()
                    return [item["embedding"] for item in data.get("data", [])]
        except Exception:
            pass
        from app.services.embeddings.local_provider import LocalSemanticEmbeddingProvider
        return LocalSemanticEmbeddingProvider(dimension=self._dim).embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        res = self.embed_documents([text])
        return res[0] if res else [0.0] * self._dim
