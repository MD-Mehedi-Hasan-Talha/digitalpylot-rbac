# 🏗️ RBAC System — Senior Engineer Implementation Plan

এই plan টা follow করলে তুমি 24 ঘণ্টায় একটা **impressive, production-quality** application deliver করতে পারবে। চলো breakdown করি:

---

## 📊 Strategy Overview — কীভাবে ভাবতে হবে

Interview task-এ judge করা হয় **3টা জিনিস**:
1. **Code Quality** — Architecture, naming, clean code
2. **Feature Completeness** — কতটুকু spec পূরণ করেছ
3. **Presentation** — Live demo, commit history, README

তাই priority হবে: **Working Core Features > Perfect Code > Every Feature**

---

## 🕐 24-Hour Timeline

| Time | Task |
|------|------|
| 0–2h | Project setup, DB schema, Auth backend |
| 2–5h | Core API endpoints (users, permissions) |
| 5–8h | Next.js frontend scaffold + middleware |
| 8–12h | Permission UI + Dynamic sidebar |
| 12–16h | All pages + Role flows |
| 16–20h | Audit log + Polish + Responsive |
| 20–22h | Deployment |
| 22–24h | README + Final testing |

---

## 🗄️ Phase 1 — Database Schema (PostgreSQL)

এটাই পুরো system-এর backbone। এখানে ভুল হলে সব ভাঙবে।

```sql
-- Core tables
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'manager', 'agent', 'customer'
  level INTEGER NOT NULL -- admin=4, manager=3, agent=2, customer=1
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atom VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'page:users', 'page:reports', 'action:ban_user'
  label VARCHAR(150) NOT NULL,
  category VARCHAR(50) -- 'page', 'action', 'data'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  role_id UUID REFERENCES roles(id),
  manager_id UUID REFERENCES users(id), -- who manages this user
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role-level default permissions
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Per-user permission overrides (additions/removals)
CREATE TABLE user_permissions (
  user_id UUID REFERENCES users(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN NOT NULL, -- true=grant, false=revoke
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);

-- Append-only audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'user.created', 'permission.granted', etc.
  target_type VARCHAR(50), -- 'user', 'permission'
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session blacklist (for logout/revoke)
CREATE TABLE token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
```

**Permission Atoms** — এগুলো seed করতে হবে:
```
page:dashboard, page:users, page:leads, page:tasks,
page:reports, page:audit_log, page:settings, page:customer_portal,
action:create_user, action:edit_user, action:suspend_user,
action:ban_user, action:manage_permissions, action:view_audit_log
```

---

## ⚙️ Phase 2 — Backend Architecture (Nodejs, ExpressJS)

### Module Structure
```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts          # login, refresh, logout
│   ├── jwt.strategy.ts
│   ├── refresh.strategy.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── permission.guard.ts   # ← এটাই সবচেয়ে important
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── users.controller.ts
├── permissions/
│   ├── permissions.module.ts
│   ├── permissions.service.ts    # resolveUserPermissions() — grant ceiling logic
│   └── permissions.controller.ts
├── audit/
│   └── audit.service.ts          # inject everywhere, log everything
└── common/
    ├── decorators/
    │   └── require-permission.decorator.ts
    └── interceptors/
        └── audit.interceptor.ts
```

### Grant Ceiling Logic — এটা সবচেয়ে critical business logic

```typescript
// permissions.service.ts
async resolveUserPermissions(userId: string): Promise<string[]> {
  const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role'] });
  
  // 1. Start with role's default permissions
  const rolePerms = await this.getRolePermissions(user.role.id);
  const permSet = new Set(rolePerms.map(p => p.atom));
  
  // 2. Apply user-specific overrides
  const userOverrides = await this.userPermRepo.find({ where: { user_id: userId } });
  for (const override of userOverrides) {
    if (override.granted) {
      permSet.add(override.permission.atom);
    } else {
      permSet.delete(override.permission.atom);
    }
  }
  
  return Array.from(permSet);
}

async grantPermission(grantorId: string, targetUserId: string, permAtom: string) {
  // GRANT CEILING: grantor must have this permission themselves
  const grantorPerms = await this.resolveUserPermissions(grantorId);
  if (!grantorPerms.includes(permAtom)) {
    throw new ForbiddenException('You cannot grant a permission you do not hold');
  }
  
  // Also check grantor has 'action:manage_permissions'
  if (!grantorPerms.includes('action:manage_permissions')) {
    throw new ForbiddenException('No permission management access');
  }
  
  // Save override
  await this.userPermRepo.upsert({ user_id: targetUserId, permission_id: permId, granted: true, granted_by: grantorId }, [...]);
  
  // Audit log
  await this.auditService.log(grantorId, 'permission.granted', 'user', targetUserId, { atom: permAtom });
}
```

### API Endpoints

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /users                     # list (filtered by role hierarchy)
POST   /users                     # create
GET    /users/:id
PATCH  /users/:id
PATCH  /users/:id/status          # suspend/ban

GET    /users/:id/permissions     # resolved permission set
POST   /users/:id/permissions     # grant atom
DELETE /users/:id/permissions/:atom  # revoke atom

GET    /permissions               # all available atoms

GET    /audit-logs                # paginated, filterable

GET    /me                        # current user + resolved permissions
```

---

## 🖥️ Phase 3 — Frontend Architecture (Next.js 14)

### Folder Structure
```
app/
├── (auth)/
│   └── login/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx               # sidebar + permission context
│   ├── dashboard/page.tsx
│   ├── users/page.tsx
│   ├── leads/page.tsx
│   ├── tasks/page.tsx
│   ├── reports/page.tsx
│   ├── audit-log/page.tsx
│   ├── settings/page.tsx
│   └── customer-portal/page.tsx
├── 403/page.tsx
└── middleware.ts                 # ← CRITICAL: route protection
```

### Middleware — Route Protection এর হৃদয়

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  
  // Page → Permission atom mapping
  const PAGE_PERMISSIONS: Record<string, string> = {
    '/dashboard': 'page:dashboard',
    '/users': 'page:users',
    '/reports': 'page:reports',
    '/audit-log': 'page:audit_log',
    // ...
  };
  
  const requiredAtom = PAGE_PERMISSIONS[request.nextUrl.pathname];
  if (!requiredAtom) return NextResponse.next();
  
  // Verify permission via API (or decode from JWT claims)
  const userPerms: string[] = parsePermissionsFromToken(token);
  
  if (!userPerms.includes(requiredAtom)) {
    return NextResponse.redirect(new URL('/403', request.url));
  }
  
  return NextResponse.next();
}
```

**Pro tip:** JWT payload-এ permission atoms embed করো। এতে middleware-এ API call লাগবে না → fast।

```typescript
// JWT payload structure
{
  sub: userId,
  email: "user@example.com",
  role: "manager",
  permissions: ["page:dashboard", "page:users", "action:create_user", ...],
  iat: ...,
  exp: ...
}
```

### Dynamic Sidebar

```typescript
// components/Sidebar.tsx
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', atom: 'page:dashboard', icon: HomeIcon },
  { label: 'Users', href: '/users', atom: 'page:users', icon: UsersIcon },
  { label: 'Leads', href: '/leads', atom: 'page:leads', icon: FunnelIcon },
  { label: 'Tasks', href: '/tasks', atom: 'page:tasks', icon: CheckIcon },
  { label: 'Reports', href: '/reports', atom: 'page:reports', icon: ChartIcon },
  { label: 'Audit Log', href: '/audit-log', atom: 'page:audit_log', icon: LogIcon },
  { label: 'Settings', href: '/settings', atom: 'page:settings', icon: GearIcon },
];

export function Sidebar() {
  const { permissions } = useAuth(); // from context
  const visibleItems = NAV_ITEMS.filter(item => permissions.includes(item.atom));
  
  return <nav>{visibleItems.map(item => <NavLink key={item.href} {...item} />)}</nav>;
}
```

### Permission Editor UI

এটা interview-এ সবচেয়ে বেশি impress করবে:

```typescript
// app/users/[id]/permissions/page.tsx
export default function PermissionEditor({ userId }) {
  const { data: allPerms } = useQuery(['permissions'], fetchAllPermissions);
  const { data: userPerms } = useQuery(['user-perms', userId], () => fetchUserPermissions(userId));
  const { permissions: myPerms } = useAuth(); // grant ceiling check
  
  const toggle = async (atom: string, currentlyGranted: boolean) => {
    // Client-side ceiling check (backend also enforces)
    if (!myPerms.includes(atom)) {
      toast.error("You don't hold this permission yourself");
      return;
    }
    
    if (currentlyGranted) {
      await revokePermission(userId, atom);
    } else {
      await grantPermission(userId, atom);
    }
    
    queryClient.invalidateQueries(['user-perms', userId]);
  };
  
  return (
    <div className="permission-editor">
      {Object.entries(groupByCategory(allPerms)).map(([category, perms]) => (
        <PermissionGroup key={category} category={category}>
          {perms.map(perm => (
            <PermissionToggle
              key={perm.atom}
              permission={perm}
              granted={userPerms.includes(perm.atom)}
              disabled={!myPerms.includes(perm.atom)} // grant ceiling UI
              onToggle={() => toggle(perm.atom, userPerms.includes(perm.atom))}
            />
          ))}
        </PermissionGroup>
      ))}
    </div>
  );
}
```

---

## 🚀 Phase 4 — Deployment Strategy

```
Frontend → Vercel (free tier, perfect for Next.js)
Backend  → Railway.app অথবা Render.com (free tier)
Database → Supabase (free PostgreSQL, 500MB)
```

**Vercel environment variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## 📝 Commit Strategy — Meaningful History দেখাও

feat: initialize Next.js 14 project with App Router and TypeScript
feat: set up Nodejs, ExpressJS backend with PostgreSQL and Prisma ORM
feat: implement JWT auth with access token + httpOnly refresh cookie
feat: add role-based permission system with grant ceiling enforcement
feat: create dynamic sidebar that renders from resolved permissions
feat: implement middleware.ts for server-side route permission gating
feat: build permission editor UI with toggle and ceiling validation
feat: add audit log system with append-only event tracking
feat: implement user management CRUD with suspend/ban lifecycle
feat: add responsive layout with mobile sidebar drawer
feat: deploy frontend to Vercel and backend to Railway
docs: add comprehensive README with setup and architecture overview
```

---

## 📄 README Structure — এটা অনেক important

```markdown
# RBAC System — Dynamic Permissions Platform

🔗 Live Demo: https://rbac-system.vercel.app
📦 Frontend: https://github.com/you/rbac-frontend
⚙️ Backend: https://github.com/you/rbac-backend

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Admin@123 |
| Manager | manager@test.com | Manager@123 |
| Agent | agent@test.com | Agent@123 |

## Architecture
[Brief explanation of permission resolution flow]

## Setup
[Local dev instructions]
```

---

## ⚡ Quick Wins — এগুলো করলে extra marks পাবে

1. **Toasts/notifications** — সব action-এ success/error feedback
2. **Loading skeletons** — blank screen দেখাবে না
3. **403 page** — custom design করো, শুধু "Access Denied" text না
4. **Seed script** — `npm run seed` দিয়ে test data populate হবে, reviewer-এর কাজ সহজ হবে
5. **Prisma** — raw SQL-এর বদলে Prisma ORM ব্যবহার করো, code cleaner দেখায়
6. **React Query** — client-side data fetching-এ, automatic cache invalidation সহজ করে

---

## ⚠️ Common Mistakes যা করবে না

- ❌ `localStorage`-এ JWT access token রেখো না (spec বলেছে in-memory)
- ❌ Role-based check করো না, permission atom check করো
- ❌ Frontend-only permission guard — backend-এও enforce করতে হবে
- ❌ `console.log` production code-এ রেখো না
- ❌ `.env` file GitHub-এ push করো না

---

## 🎯 Interview Score Maximizer — Final Tips

**এটা কী করলে guaranteed impression হবে:**

Permission editor-এ যখন একজন Manager কোনো permission toggle করতে যায় যেটা তার নিজের নেই, সেটা **greyed out** দেখাবে এবং hover করলে tooltip আসবে: *"You don't hold this permission"* — এই একটা UI detail দেখলেই interviewer বুঝবে তুমি spec সত্যিই পড়েছ এবং business logic বুঝেছ।

**Focus order (যদি সময় কম হয়):**
1. Auth + Login page (Figma-এর মতো)
2. Dynamic sidebar working
3. Middleware route protection
4. Permission toggle UI
5. User list + status change
6. Audit log page
