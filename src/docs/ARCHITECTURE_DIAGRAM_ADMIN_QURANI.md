# Diagram Arsitektur `admin-qurani-org`

Dokumen ini berisi diagram alur utama project dalam format Mermaid.

## 1) High-Level Architecture

```mermaid
flowchart LR
    U[User Browser] --> N[Next.js App Router]

    N --> M[Middleware Auth Guard]
    M -->|Valid| P[Protected Pages]
    M -->|Invalid| L[Login Page]

    P --> C1[Client Layer<br/>src/lib/api.ts]
    P --> C2[Legacy Utils<br/>src/utils/api/*]
    P --> C3[Next API Routes<br/>src/app/api/*]

    C1 --> MQ[MyQurani API]
    C2 --> SB[(Supabase)]
    C3 --> MQ
    C3 --> SB
    C3 --> R[(Redis)]
```

---

## 2) Auth Flow (Current Hybrid)

```mermaid
sequenceDiagram
    participant User
    participant LoginForm
    participant LibApi as lib/api authApi
    participant LoginAction as utils/Auth/login.ts
    participant Cookie as Browser Cookie
    participant Middleware
    participant Dashboard

    User->>LoginForm: submit username/password
    LoginForm->>LibApi: authApi.login()
    alt success from MyQurani API
        LibApi->>Cookie: set myqurani_* (client-side fallback)
    else failed
        LoginForm->>LoginAction: loginMyQurani(formData)
        LoginAction->>Cookie: set myqurani_* (server-side)
    end

    User->>Middleware: navigate to /dashboard
    Middleware->>Cookie: read myqurani_access_token + myqurani_user
    alt token exists
        Middleware-->>Dashboard: allow access
    else fallback
        Middleware->>Middleware: check supabase session
        alt no session
            Middleware-->>User: redirect /login
        else session ok
            Middleware-->>Dashboard: allow access
        end
    end
```

---

## 3) Data Source Mapping

```mermaid
flowchart TB
    A[UI Components] --> B{Data Access Path}

    B -->|Modern| C[src/lib/api.ts]
    B -->|Legacy| D[src/utils/api/*]
    B -->|Internal Proxy| E[src/app/api/*]

    C --> C1[usersApi]
    C --> C2[ticketsApi]
    C --> C3[groupsApi]
    C --> C4[masterdataApi]
    C --> C5[authApi]

    C1 --> MQ[MyQurani API]
    C2 --> MQ
    C3 --> MQ
    C4 --> MQ
    C5 --> MQ

    D --> SB[(Supabase)]
    E --> MQ
    E --> SB
```

---

## 4) Module Navigation Map

```mermaid
flowchart LR
    D[Dashboard Layout + Sidebar]
    D --> S1[Dashboard]
    D --> S2[Support]
    D --> S3[Billing]
    D --> S4[Administrator]
    D --> S5[Master Data]
    D --> S6[Notifications]
    D --> S7[Settings]

    S2 --> S21[Support Tickets]
    S2 --> S22[Groups]
    S2 --> S23[Recitation/KYC]

    S4 --> S41[Admin Dashboard]
    S4 --> S42[Users Manage]

    S5 --> S51[Countries]
    S5 --> S52[States]
    S5 --> S53[Cities]
    S5 --> S54[Currencies]
    S5 --> S55[Languages]
```

---

## 5) Ticket Flow (Hybrid Runtime)

```mermaid
flowchart TD
    UI[SupportTicketsPage] --> L1[ticketsApi.getTickets()]
    L1 --> MQ[MyQurani API]

    UI --> L2[/api/tickets/supabase/list]
    L2 --> SB[(Supabase tickets)]

    MQ --> Merge[Merge & Normalize Data]
    SB --> Merge
    Merge --> UI2[Render Table/Card + Filters]
```

---

## 6) Group Flow (Mixed)

```mermaid
flowchart TD
    G1[Group Pages] --> H1[use-grup-data.ts]
    H1 --> H2[MyQurani Groups Search API]

    G1 --> H3[use-group-members.ts]
    H3 --> H4[/api/grup?action=getGroupMembers]
    H4 --> SB[(Supabase grup_members)]

    G1 --> H5[Member Mutation]
    H5 --> H6[/api/grup POST action=*]
    H6 --> SB
```

---

## 7) Catatan Interpretasi Diagram

1. Jalur tebal modern: `src/lib/api.ts` -> MyQurani API.
2. Jalur legacy penting: `src/utils/api/*` dan `/api/grup` masih banyak ke Supabase.
3. Middleware adalah gerbang utama auth route.
4. Bug yang paling sering: sinkronisasi token/cookie + perbedaan sumber data antar modul.
