# 🏛️ Alesuke — Digital Estate Planning, Will Preparation & Legacy Asset Custody API

![Architecture Banner](./assets/banner.svg)

<p align="center">
  <a href="https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio" target="_blank">
    <img src="https://run.pstmn.io/button.svg" alt="View in Postman" />
  </a>
  <a href="https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio" target="_blank">
    <img src="https://img.shields.io/badge/Postman-Instant_Live_API_Docs-FF6C37?style=for-the-badge&logo=postman&logoColor=white" alt="Live API Documentation" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Legal_Tech-6366F1?style=for-the-badge&logo=shield&logoColor=white" alt="Legal_Tech" />
  
</p>

---

## 📌 Executive Overview

**Alesuke Backend** is a legal-technology and digital estate planning backend engine that serves the Alesuke web portal. Engineered with **Node.js, TypeScript, Express, Prisma ORM, and Stripe**, the platform provides bank-grade digital asset custody: **comprehensive digital and tangible asset registries**, guided **Last Will & Testament preparation workflows**, designated loved ones/beneficiaries management, recurring Stripe subscription custody tiers, and automated inheritance delivery triggers.

---

## 🚀 Key Architectural & Domain Capabilities

- **Structured Will Preparation**: Legal questionnaire engine guiding users through creating binding testamentary declarations and estate clauses.
- **Digital & Physical Asset Custody**: Encrypted asset registry cataloging financial accounts, digital assets, cryptocurrency keys, and physical heirlooms.
- **Loved Ones & Beneficiary Allocation**: Link specific estate assets or percentage shares to verified family beneficiaries.
- **Subscription & Plan Management**: Multi-tier estate custody plans powered by Stripe subscription checkout and webhook management.
- **Enterprise Security & Auditing**: End-to-end data validation, bcrypt password hashing, and encrypted sensitive attribute storage.

---

## 📬 API Documentation & Interactive Postman Collection

The complete REST API specification is published in our public Postman showcase workspace:

* 🌐 **Instant Live API Documentation**: [Explore alesuke_backend in Postman (Instant Web View)](https://www.postman.com/shahjalal-backend-9458759/shahjalal-api-portfolio)
* 📁 **Local Postman File**: [`docs/postman_collection.json`](./docs/postman_collection.json) (ready for Postman Desktop or Newman CLI).

### Core Endpoint Modules

| Module | Base Route | Key Capabilities |
|---|---|---|
| **Authentication** | `/api/v1/Auth` | User onboarding, multi-factor verification, JWT token lifecycle |
| **Will Preparation** | `/api/v1/will` | Draft last will documents, clause customization, legal declaration steps |
| **Asset Management** | `/api/v1/assetManagement` | Tangible estate assets, valuations, heir designations |
| **Digital Assets** | `/api/v1/digitalAssets` | Cryptocurrency wallets, online accounts, digital intellectual property |
| **Subscriptions & Billing** | `/api/v1/subscription` | Stripe subscription tiers, invoice history, payment webhooks |

---

## 📂 Project Architecture

```plaintext
alesuke_backend/
├── assets/
│   └── banner.svg               # Architectural visual banner
├── docs/
│   └── postman_collection.json  # Full Postman API collection v2.1
├── src/
│   ├── app/
│   │   ├── middlewares/         # Global error handlers, auth & validation guards
│   │   ├── modules/             # Domain feature modules
│   │   └── routes/              # Centralized route registration
│   ├── config/                  # Environment & external service configurations
│   └── server.ts                # Application bootstrapper
├── prisma/
│   └── schema.prisma            # Prisma database schema definition
├── .env.example                 # Sanitized environment template
├── package.json
└── tsconfig.json
```

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
* **Node.js**: `v20.x` or higher
* **Database**: MongoDB or PostgreSQL (as specified in `schema.prisma`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shahjalal-labs/alesuke_backend.git
cd alesuke_backend
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 👨‍💻 Engineering & Authorship

Developed and engineered by **Md. Shahjalal**.

* **GitHub**: [@shahjalal-labs](https://github.com/shahjalal-labs)
* **Email**: [muhommodshahjalal@gmail.com](mailto:muhommodshahjalal@gmail.com)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
