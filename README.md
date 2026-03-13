# DigitalPylot - Advanced RBAC Management Portal

DigitalPylot is a premium enterprise-grade administration portal featuring a robust Role-Based Access Control (RBAC) system. The platform is designed with a focus on visual excellence, security, and administrative control.

![Overlay Redesign Concept](https://img.shields.io/badge/Design-Overlay--Inspired-orange)
![Tech-Stack](https://img.shields.io/badge/Stack-Next.js%2014%20|%20Node.js%20|%20Prisma-blue)

---

## 🚀 Key Features

### 🔐 Advanced RBAC System
- **Hierarchical Access**: Defined roles (Admin > Manager > Agent) with inherent superiority levels.
- **Grant Ceiling**: A specialized logic-gate ensuring users cannot grant permissions they do not possess.
- **Permission Atoms**: Granular control over specific pages and actions (e.g., `page:users`, `action:suspend_user`).
- **Audit Logging**: Immutable system-wide trail of all administrative and authentication events.

### 🎨 "Overlay" Inspired UI
- **Light Professional Theme**: Clean, highly readable interface using the Inter font family.
- **High-Utility Sidebar**: Dynamic navigation with categorization and workspace switching.
- **Unified Header**: Integrated global search (⌘K) and utility management.
- **Multi-View Dashboard**: High-fidelity task management with priority-based grouping and participant avatars.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS Modules (Premium Aesthetics)
- **Auth Management**: React Context API with JWT silent-refresh
- **Icons/Graphics**: Custom SVG systems

### Backend
- **Core**: Node.js & Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Dockerized)
- **Security**: JWT (Access + Refresh Tokens) with blacklisting support

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd digitalpylot
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   docker-compose up -d  # Spin up PostgreSQL
   pnpm install
   npx prisma migrate dev
   pnpm run seed         # Populate roles and users
   pnpm start
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   pnpm install
   pnpm dev
   ```

---

## 📋 Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@test.com` | `Admin@123` |
| **Workspace Manager** | `manager@test.com` | `Manager@123` |
| **Support Agent** | `agent@test.com` | `Agent@123` |

---

## 📂 Project Structure

```text
digitalpylot/
├── backend/            # Express.js Server & Prisma Logic
│   ├── src/controllers # Route handlers
│   ├── src/middleware  # Auth & RBAC checks
│   ├── prisma/         # Schema & Migrations
│   └── ...
├── frontend/           # Next.js 14 Application
│   ├── src/app         # App Router & Layouts
│   ├── src/components  # Visual components
│   ├── src/context     # Auth State & API Client
│   └── ...
└── README.md           # Project Documentation
```

---

## 📄 License
Internal use for DigitalPylot platform development.
