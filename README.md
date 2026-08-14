# 🏗️ Sanrachna — AI-Powered Construction Intelligence Platform

<p align="center">
  <strong>Plan • Monitor • Collaborate • Predict</strong>
</p>

<p align="center">
Sanrachna is an AI-enabled construction management ecosystem designed to streamline planning, workforce coordination, cost estimation, issue tracking, safety monitoring, and real-time project execution across construction sites.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=flat&logo=mongodb" />
  <img src="https://img.shields.io/badge/AI-Integrated-orange" />
</p>

---

# 📖 About Sanrachna

> **“Sanrachna”** *(संरचना)* is derived from Sanskrit and represents **structure, architecture, and intelligent construction systems**.

Sanrachna is a modern full-stack construction management platform built to bridge communication and operational gaps between project owners, engineers, supervisors, and on-site workers.

The platform combines:
- AI-assisted project planning
- Smart workforce coordination
- Real-time issue tracking
- Cost prediction
- Document workflows
- Safety management
- Analytics and reporting

into one unified ecosystem.

---

# 🎯 Vision

Construction projects often rely on fragmented communication, manual reporting, delayed decision-making, and disconnected tools.

Sanrachna aims to transform this workflow through:
- intelligent automation,
- centralized collaboration,
- predictive analytics,
- and AI-driven project assistance.

The goal is to build a scalable construction intelligence platform capable of supporting infrastructure projects of all scales.

---

# 🚀 Recent Updates

- **Revamped Landing Page:** A modern, immersive landing page featuring 3D assets, dark mode, and responsive design.
- **Advanced AI Copilot & RAG:** Integrated **Groq** for ultra-fast AI inference and a **Retrieval-Augmented Generation (RAG)** pipeline to provide context-aware construction insights directly within the platform.
- **Procurement & Supply Chain Engine:** Enhanced the procurement page with AI-driven procurement recommendations, timeline scheduling, and automated Request for Quote (RFQ) generation.
- **Workforce Management:** Added a dedicated Workforce Page for real-time labor tracking, allocation, and coordination.

---

# ✨ Core Features

## 🧠 AI Planning Studio
- Generate complete project execution plans using AI
- Automatic task breakdown and milestone generation
- AI-assisted resource allocation and procurement planning
- Context-aware construction copilot with project memory

---

## 📊 Real-Time Dashboard
- Live project health indicators
- Timeline and progress monitoring
- Cost burn-rate analytics
- Workforce and resource utilization insights

---

## 📋 Smart Task Management
- Role-based task assignment
- Priority and deadline tracking
- Task lifecycle monitoring
- Real-time updates for field teams

---

## 🧾 Daily Progress Logs
- Workers can submit on-site progress reports
- Engineers can review and approve submissions
- Historical project log management
- Structured progress tracking across phases

---

## 🚨 Safety & Emergency Management
- Incident reporting workflows
- Severity-based emergency classification
- Safety audit trail
- Emergency escalation system

---

## 📄 Document Management System
- Centralized document repository
- Upload and categorize construction documents
- Version-aware file access
- Secure project-level storage

---

## 💬 RFI (Request For Information)
- Structured RFI workflow management
- Communication between field and office teams
- Status tracking and threaded discussions

---

## ⚠️ Issue Tracking System
- Raise and assign project issues
- Track resolution progress
- Associate issues with tasks and project phases
- Priority-based escalation

---

## 💰 Cost & Resource Management
- Budget vs actual cost tracking
- Procurement planning
- Resource allocation visualization
- Material requirement estimation

---

## 📈 ML-Based Cost Estimation
- Predict estimated project costs using machine learning
- Budget forecasting before execution
- Data-driven decision assistance

---

## 📑 AI Report Generation
- Automated construction progress reports
- PDF export support
- AI-generated narrative summaries
- Risk and timeline analysis

---

## 🔐 Role-Based Access Control
Three dedicated access levels:
- **Owner**
- **Engineer**
- **Worker**

Each role receives a tailored interface and permissions system.

---

# 🏛️ System Architecture

```mermaid
graph TD

A[Frontend - React + TypeScript]
B[Node.js Backend API]
C[MongoDB Database]
D[AI Services]
E[FastAPI Report Engine]
F[PDF Generator]
G[ML Cost Estimation Engine]

A --> B
B --> C
B --> D
B --> E
E --> F
B --> G