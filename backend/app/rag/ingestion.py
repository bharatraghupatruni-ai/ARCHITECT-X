import hashlib
import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.rag.schemas import EvidenceChunk, IngestionSummary
from app.rag.embeddings import embedding_service

logger = logging.getLogger("architect_x.rag")


class DocumentIngestionService:
    """
    Ingests curated technical markdown documents from knowledge_base/ directory,
    splits them into semantically coherent section chunks, generates embeddings,
    and indexes them into the vector database.
    """

    def __init__(self, kb_dir: Optional[str] = None):
        self.kb_dir = kb_dir or os.getenv("KNOWLEDGE_BASE_DIR") or "knowledge_base"
        self._find_kb_dir()

    def _find_kb_dir(self) -> Path:
        """Find the absolute path to knowledge_base directory."""
        candidates = [
            Path(self.kb_dir),
            Path(__file__).resolve().parent.parent.parent / "knowledge_base",
            Path(__file__).resolve().parent.parent.parent.parent / "knowledge_base",
            Path.cwd() / "knowledge_base",
            Path.cwd().parent / "knowledge_base",
        ]
        for c in candidates:
            if c.exists() and c.is_dir():
                return c
        return Path("knowledge_base")

    def parse_markdown_document(self, file_path: Path) -> List[EvidenceChunk]:
        """Parse a markdown file into section-aware chunks."""
        chunks: List[EvidenceChunk] = []
        source_name = file_path.name

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as exc:
            logger.error(f"Failed to read document '{file_path}': {exc}")
            return []

        # Extract top-level document title (# Title)
        doc_title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        doc_title = doc_title_match.group(1).strip() if doc_title_match else source_name

        # Split content by markdown sections (## Section)
        sections = re.split(r"(?m)^##\s+", content)
        intro = sections[0].strip()

        if intro and len(intro) > 30:
            chunk_id = hashlib.sha256(f"{source_name}_intro_{intro[:50]}".encode()).hexdigest()[:16]
            chunks.append(
                EvidenceChunk(
                    chunk_id=chunk_id,
                    source=source_name,
                    section=doc_title,
                    text=intro,
                    metadata={
                        "document_title": doc_title,
                        "source": source_name,
                        "char_count": len(intro),
                    },
                )
            )

        for sec_idx, section_content in enumerate(sections[1:], start=1):
            lines = section_content.strip().split("\n")
            section_title = lines[0].strip()
            section_body = "\n".join(lines[1:]).strip()

            full_section_text = f"## {section_title}\n\n{section_body}" if section_body else section_title
            
            # If section is very long (> 1200 chars), subdivide by sub-headings (###) or paragraphs
            if len(full_section_text) > 1200:
                sub_parts = self._split_long_section(section_title, section_body)
                for sub_idx, sub_text in enumerate(sub_parts):
                    chunk_id = hashlib.sha256(f"{source_name}_{sec_idx}_{sub_idx}_{sub_text[:40]}".encode()).hexdigest()[:16]
                    chunks.append(
                        EvidenceChunk(
                            chunk_id=chunk_id,
                            source=source_name,
                            section=f"{section_title} (Part {sub_idx+1})",
                            text=sub_text,
                            metadata={
                                "document_title": doc_title,
                                "section": section_title,
                                "source": source_name,
                                "char_count": len(sub_text),
                            },
                        )
                    )
            else:
                chunk_id = hashlib.sha256(f"{source_name}_{sec_idx}_{section_title}".encode()).hexdigest()[:16]
                chunks.append(
                    EvidenceChunk(
                        chunk_id=chunk_id,
                        source=source_name,
                        section=section_title,
                        text=full_section_text,
                        metadata={
                            "document_title": doc_title,
                            "section": section_title,
                            "source": source_name,
                            "char_count": len(full_section_text),
                        },
                    )
                )

        return chunks

    def _split_long_section(self, section_title: str, section_body: str) -> List[str]:
        """Subdivide long sections by paragraph or bullet groupings."""
        paragraphs = section_body.split("\n\n")
        parts = []
        current_buf = f"## {section_title}\n"

        for p in paragraphs:
            if len(current_buf) + len(p) < 900:
                current_buf += f"\n{p}"
            else:
                if current_buf.strip():
                    parts.append(current_buf.strip())
                current_buf = f"## {section_title} (cont.)\n\n{p}"

        if current_buf.strip():
            parts.append(current_buf.strip())

        return parts if parts else [f"## {section_title}\n\n{section_body}"]

    def load_all_documents(self) -> List[EvidenceChunk]:
        """Scans knowledge base directory and parses all markdown files."""
        kb_path = self._find_kb_dir()
        if not kb_path.exists():
            logger.warning(f"Knowledge base directory '{kb_path}' not found.")
            return []

        all_chunks: List[EvidenceChunk] = []
        md_files = sorted(list(kb_path.glob("*.md")))

        for md_file in md_files:
            doc_chunks = self.parse_markdown_document(md_file)
            all_chunks.extend(doc_chunks)
            logger.info(f"Parsed {len(doc_chunks)} chunks from '{md_file.name}'")

        return all_chunks


document_ingestion_service = DocumentIngestionService()
