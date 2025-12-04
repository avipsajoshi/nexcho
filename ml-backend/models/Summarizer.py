# Summarizer.py
from typing import List
import numpy as np
import math
import re
from collections import Counter, defaultdict

class Summarizer:
    def __init__(self, damping: float = 0.85, max_iter: int = 100):
        self.damping = damping
        self.max_iter = max_iter

    def split_into_sentences(self, text: str) -> List[str]:
        parts = re.split(r'[.!?]+', text)
        return [p.strip() for p in parts if p.strip()]

    def simple_tokenize(self, text: str) -> List[str]:
        text = text.lower()
        text = re.sub(r'[^a-z\s]', ' ', text)
        return [t for t in text.split() if t]
    # TF, DF, IDF
    def compute_tf(self, tokens: List[str]):
        total = len(tokens)
        if total == 0:
            return {}
        counts = Counter(tokens)
        return {w: counts[w] / total for w in counts}
    def compute_df(self, sentences_tokens: List[List[str]]):
        df = defaultdict(int)
        for tokens in sentences_tokens:
            for t in set(tokens):
                df[t] += 1
        return dict(df)
    def compute_idf(self, df: dict, N: int):
        return {term: math.log(N / (1 + df_val)) for term, df_val in df.items()}
    # TF-IDF Matrix
    def compute_tfidf_matrix(self, sentences_tokens: List[List[str]]):
        N = len(sentences_tokens)
        vocab = sorted({t for s in sentences_tokens for t in s})
        df = self.compute_df(sentences_tokens)
        idf = self.compute_idf(df, N)
        index = {t: i for i, t in enumerate(vocab)}
        tfidf = np.zeros((N, len(vocab)), dtype=float)
        for i, tokens in enumerate(sentences_tokens):
            tf = self.compute_tf(tokens)
            for term, tf_val in tf.items():
                tfidf[i, index[term]] = tf_val * idf.get(term, 0.0)
        return tfidf
    # Cosine Similarity
    def cosine_similarity_matrix(self, mat: np.ndarray):
        if mat.size == 0:
            return np.array([[]])

        norms = np.linalg.norm(mat, axis=1)
        norms = np.where(norms == 0, 1e-12, norms)
        dot = mat @ mat.T
        denom = np.outer(norms, norms)
        sim = dot / denom
        np.fill_diagonal(sim, 0.0)
        return sim
    # TextRank Algorithm
    def text_rank(self, sim: np.ndarray) -> np.ndarray:
        n = sim.shape[0]
        if n == 0:
            return np.array([])
        # Transition matrix
        row_sums = sim.sum(axis=1)
        T = np.zeros_like(sim)

        for i in range(n):
            if row_sums[i] > 0:
                T[i, :] = sim[i, :] / row_sums[i]
            else:
                T[i, :] = 1.0 / n

        r = np.ones(n) / n  # uniform init
        damping = self.damping

        for _ in range(self.max_iter):
            prev = r.copy()
            r = (1 - damping) + damping * (T.T @ r)
            if np.linalg.norm(r - prev, 1) < 1e-6:
                break

        return r / r.sum()
    def summarize_sentences(self, sentences: List[str], max_sentences: int = 3) -> List[str]:
        if len(sentences) == 0:
            return []

        tokens = [self.simple_tokenize(s) for s in sentences]
        tfidf = self.compute_tfidf_matrix(tokens)
        sim = self.cosine_similarity_matrix(tfidf)
        scores = self.text_rank(sim)

        ranked = np.argsort(-scores)
        top_ids = sorted(ranked[:max_sentences])  # keep natural order

        return [sentences[i] for i in top_ids]
    
    def summarize(self, text: str, max_sentences: int = 3) -> str:
        sentences = self.split_into_sentences(text)
        selected = self.summarize_sentences(sentences, max_sentences)
        return " ".join(selected)
