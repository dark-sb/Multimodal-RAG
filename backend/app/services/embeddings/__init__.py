from app.core.config import settings
from app.services.embeddings.base import BaseEmbeddingProvider
from app.services.embeddings.local_provider import LocalSemanticEmbeddingProvider
from app.services.embeddings.remote_providers import GeminiEmbeddingProvider, OpenAIEmbeddingProvider

_provider_instance = None

def get_embedding_provider() -> BaseEmbeddingProvider:
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    if settings.EMBEDDING_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        _provider_instance = GeminiEmbeddingProvider(api_key=settings.GEMINI_API_KEY)
    elif settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        _provider_instance = OpenAIEmbeddingProvider(api_key=settings.OPENAI_API_KEY)
    else:
        _provider_instance = LocalSemanticEmbeddingProvider()
        
    return _provider_instance
