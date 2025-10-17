# System Architecture

## Overview

The WhatsApp Integration platform follows a modern, scalable architecture with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                     (React Frontend)                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTP/HTTPS
                       │ Socket.io (WebSocket)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    Load Balancer / Nginx                        │
│                         (Optional)                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
┌────────▼────────┐         ┌────────▼────────┐
│  Backend API    │         │  Frontend       │
│  (Node.js)      │         │  (React)        │
│  Port: 3001     │         │  Port: 3000     │
└────────┬────────┘         └─────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│Postgres│ │UniPile │
│   DB  │ │  API   │
└───────┘ └─────────┘
```

## Component Architecture

### Frontend (React)

```
┌─────────────────────────────────────────────────────┐
│                    React App                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Login Page  │  │ Connections  │  │  Inbox    │ │
│  │             │  │    Page      │  │   Page    │ │
│  └─────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │           AuthContext (State)                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │         API Service (Axios)                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │      Socket.io Client (Real-time)             │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Backend (Node.js + Express)

```
┌─────────────────────────────────────────────────────┐
│                 Express Server                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │              Middleware Layer                 │ │
│  │  • CORS                                       │ │
│  │  • Body Parser                                │ │
│  │  • JWT Auth                                   │ │
│  │  • Entitlement Check                          │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │              Routes Layer                     │ │
│  │  • /api/auth/*                                │ │
│  │  • /api/channels/*                            │ │
│  │  • /api/webhooks/*                            │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │            Controllers Layer                  │ │
│  │  • channels.controller.ts                     │ │
│  │  • webhooks.controller.ts                     │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │             Services Layer                    │ │
│  │  • unipile.service.ts                         │ │
│  │  • entitlement.service.ts                     │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │         Socket.io (Real-time)                 │ │
│  └───────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication Flow

```
User → Frontend → POST /api/auth/test-token → Backend
                                              ↓
                                          Generate JWT
                                              ↓
User ← Frontend ← JWT Token ← Backend
```

### 2. Connect WhatsApp Account Flow

```
User → Frontend → POST /api/channels/whatsapp/connect
                                              ↓
                                    Check Entitlement
                                              ↓
                                    Store in Database
                                              ↓
User ← Frontend ← Success Response ← Backend
```

### 3. Send Message Flow

```
User → Frontend → POST /api/channels/whatsapp/:accountId/chats/:chatId/send
                                              ↓
                                    Check Entitlement
                                              ↓
                                    Call UniPile API
                                              ↓
                                    Store in Database
                                              ↓
                                    Emit Socket Event
                                              ↓
User ← Frontend ← Success ← Backend ← UniPile API
```

### 4. Receive Message Flow (Webhook)

```
WhatsApp User → WhatsApp → UniPile API
                                  ↓
                          Webhook POST
                                  ↓
                    POST /api/webhooks/unipile/messages
                                  ↓
                          Store in Database
                                  ↓
                          Emit Socket Event
                                  ↓
                    User ← Frontend ← Real-time Update
```

## Database Schema

```
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │channels_account  │      │channels_entitle  │    │
│  ├──────────────────┤      ├──────────────────┤    │
│  │id (PK)           │      │id (PK)           │    │
│  │user_id           │      │user_id           │    │
│  │provider          │      │provider          │    │
│  │external_account_ │      │is_active         │    │
│  │  id              │      │source            │    │
│  │status            │      │expires_at        │    │
│  └────────┬─────────┘      └──────────────────┘    │
│           │                                         │
│           │ FK (account_id)                         │
│           ↓                                         │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │channels_chat     │      │channels_usage    │    │
│  ├──────────────────┤      ├──────────────────┤    │
│  │id (PK)           │      │id (PK)           │    │
│  │account_id (FK)   │      │user_id           │    │
│  │provider_chat_id  │      │provider          │    │
│  │title             │      │period_ym         │    │
│  │last_message_at   │      │messages_sent     │    │
│  └────────┬─────────┘      │messages_rcvd     │    │
│           │                └──────────────────┘    │
│           │ FK (chat_id)                            │
│           ↓                                         │
│  ┌──────────────────┐                              │
│  │channels_message  │                              │
│  ├──────────────────┤                              │
│  │id (PK)           │                              │
│  │chat_id (FK)      │                              │
│  │provider_msg_id   │                              │
│  │direction         │                              │
│  │body              │                              │
│  │attachments       │                              │
│  │sent_at           │                              │
│  └──────────────────┘                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Real-time Communication (Socket.io)

```
┌──────────────┐                    ┌──────────────┐
│   Frontend   │                    │   Backend    │
│   (Client)   │                    │   (Server)   │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. Connect                        │
       ├──────────────────────────────────>│
       │                                   │
       │ 2. Join User Room                 │
       │    (join-user, userId)            │
       ├──────────────────────────────────>│
       │                                   │
       │ 3. Join Chat Room                 │
       │    (join-chat, chatId)            │
       ├──────────────────────────────────>│
       │                                   │
       │                                   │ Webhook
       │                                   │ received
       │                                   │
       │ 4. New Message                    │
       │    (message:new)                  │
       │<──────────────────────────────────┤
       │                                   │
       │ 5. Message Sent                   │
       │    (message:sent)                 │
       │<──────────────────────────────────┤
       │                                   │
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Security Layers                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Transport Security                               │
│     • HTTPS (in production)                          │
│     • TLS 1.3                                        │
│                                                      │
│  2. Authentication                                   │
│     • JWT tokens                                     │
│     • Token expiration                               │
│     • Secure token storage                           │
│                                                      │
│  3. Authorization                                    │
│     • Entitlement checks                             │
│     • Plan-based access                              │
│     • Role-based permissions                         │
│                                                      │
│  4. Input Validation                                 │
│     • Request validation                             │
│     • SQL injection prevention                       │
│     • XSS protection                                 │
│                                                      │
│  5. API Security                                     │
│     • Rate limiting (ready to add)                   │
│     • CORS configuration                             │
│     • Webhook signature verification                 │
│                                                      │
│  6. Data Security                                    │
│     • Encrypted connections                          │
│     • Secure environment variables                   │
│     • Database access control                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development

```
┌──────────────┐  ┌──────────────┐
│   Backend    │  │   Frontend   │
│ localhost:   │  │ localhost:   │
│    3001      │  │    3000      │
└──────┬───────┘  └──────────────┘
       │
       ↓
┌──────────────┐
│  PostgreSQL  │
│  localhost:  │
│    5432      │
└──────────────┘
```

### Production (Docker)

```
┌─────────────────────────────────────────────┐
│          Docker Compose Stack               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Backend    │  │   Frontend   │        │
│  │   Container  │  │   Container  │        │
│  │   (Node.js)  │  │   (Nginx)    │        │
│  └──────┬───────┘  └──────────────┘        │
│         │                                   │
│         ↓                                   │
│  ┌──────────────┐                          │
│  │  PostgreSQL  │                          │
│  │   Container  │                          │
│  └──────────────┘                          │
│                                             │
└─────────────────────────────────────────────┘
```

### Production (Cloud)

```
┌─────────────────────────────────────────────┐
│              Load Balancer                  │
└──────────┬──────────────────┬───────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │   Backend   │    │   Backend   │
    │   Instance  │    │   Instance  │
    │   (Node.js) │    │   (Node.js) │
    └──────┬──────┘    └──────┬──────┘
           │                  │
           └──────────┬───────┘
                      │
              ┌───────▼───────┐
              │  PostgreSQL   │
              │   (Managed)   │
              └───────────────┘
```

## Scalability Considerations

### Horizontal Scaling

- **Stateless Backend**: All backend instances are stateless
- **Socket.io with Redis**: Use Redis adapter for multi-instance Socket.io
- **Database Connection Pooling**: PostgreSQL connection pooling
- **Load Balancing**: Distribute traffic across instances

### Vertical Scaling

- **Database Optimization**: Indexes, query optimization
- **Caching**: Redis for frequently accessed data
- **CDN**: Static asset delivery
- **Compression**: Gzip compression for responses

## Monitoring & Logging

```
┌─────────────────────────────────────────────┐
│          Monitoring Stack                   │
├─────────────────────────────────────────────┤
│                                             │
│  • Application Logs (Winston)              │
│  • Error Tracking (Sentry)                 │
│  • Performance Monitoring (New Relic)      │
│  • Database Monitoring (pg_stat)           │
│  • Health Checks (/health endpoint)        │
│                                             │
└─────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- React 18
- TypeScript
- Socket.io Client
- Axios
- React Router

### Backend
- Node.js 18+
- Express.js
- TypeScript
- Socket.io
- PostgreSQL
- JWT
- Axios

### DevOps
- Docker
- Docker Compose
- Nginx
- PostgreSQL

### External Services
- UniPile API (WhatsApp)
- (Future: Gmail API, Microsoft Graph)

## Performance Metrics

### Target Metrics

- **API Response Time**: < 200ms (p95)
- **Message Delivery**: < 1s
- **Database Query Time**: < 50ms (p95)
- **Socket.io Latency**: < 100ms
- **Frontend Load Time**: < 2s

### Optimization Strategies

1. **Database Indexing**: All foreign keys and frequently queried columns
2. **Connection Pooling**: Max 20 connections per instance
3. **Caching**: Redis for hot data
4. **Lazy Loading**: Frontend code splitting
5. **CDN**: Static asset delivery

---

**This architecture is designed for scalability, maintainability, and performance.**

