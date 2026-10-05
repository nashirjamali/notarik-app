# ADR-001: Backend language is Python

**Status:** accepted · **Date:** 2026-10-06

## Context
The backend hosts the LangGraph agents, evals and the API. The alternatives were Python (FastAPI + LangGraph) and TypeScript (LangGraph.js), which would allow one language across app and server.

## Decision
Python with FastAPI and LangGraph.

## Consequences
- The agent, eval and tracing ecosystem is strongest in Python, and it is the common language in AI-engineering roles.
- The project uses two languages (Python backend, TypeScript app). Mitigation: generate TypeScript API types from FastAPI's OpenAPI spec (step 05).
