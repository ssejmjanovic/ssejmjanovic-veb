# Travel Planner — Chronicles

A web application for planning trips: destinations, daily activities, expense tracking, packing checklists, and shareable travel plans via QR codes.

Built with **React** (frontend) and **Microsoft Service Fabric** (backend microservices), backed by **SQL Server**.

---

## Prerequisites

Make sure all of these are installed before starting:

| Tool | Version | Purpose |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 3.1.x | Backend services |
| [Node.js](https://nodejs.org/) | 18+ | Frontend |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Any | SQL Server container |
| [Service Fabric SDK](https://learn.microsoft.com/en-us/azure/service-fabric/service-fabric-get-started) | Latest | Running the SF cluster (Windows only) |
| [Visual Studio 2019+](https://visualstudio.microsoft.com/) | 2019+ | Building and deploying SF applications (optional but recommended) |

> **Windows only:** Microsoft Service Fabric local clusters only run on Windows. The frontend can be developed on any OS.

---

## Step 1 — Start SQL Server (Docker)

Open a terminal and run:

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=SuperStrongPassword123!" \
  -p 1433:1433 --name sqlserver_travelplanner \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

Verify it is running:

```bash
docker ps
```

You should see `sqlserver_travelplanner` with status `Up`.

> The database `TravelPlannerDB` will be **created automatically** when the services start for the first time (EF Core migrations run on startup).

---

## Step 2 — Start the Service Fabric Local Cluster

1. Open **Service Fabric Local Cluster Manager** from the system tray (installed with the SF SDK).
2. Right-click → **Start Local Cluster**.
3. Wait until the cluster status shows **Running** (this can take 1–2 minutes).

Alternatively, verify via PowerShell:

```powershell
Connect-ServiceFabricCluster localhost:19000
Get-ServiceFabricClusterHealthChunk
```

---

## Step 3 — Apply Database Migrations (first run only)

The services apply migrations automatically on startup. If you want to apply them manually first:

```bash
# UserService
cd UserService
dotnet ef database update

# TravelService
cd ../TravelService
dotnet ef database update

# SharingService
cd ../SharingService
dotnet ef database update
```

---

## Step 4 — Build and Deploy the Backend

### Option A — Visual Studio (recommended)

1. Open `TravelPlanner.sln` in Visual Studio.
2. Right-click the **Service Fabric Application project** (the one with the SF icon) → **Publish**.
3. Select **Local Cluster** as the publish target.
4. Click **Publish**.

Visual Studio will build all services and deploy them to the local cluster automatically.

### Option B — PowerShell

```powershell
# From the solution root
cd TravelPlannerSF

# Build
dotnet build

# Deploy to local cluster
.\Scripts\Deploy-FabricApp.ps1 -ApplicationPackagePath ".\pkg\Debug"
```

> After deployment, verify services are running at:
> - API Gateway: http://localhost:5000
> - UserService: http://localhost:5001
> - TravelService: http://localhost:5002
> - SharingService: http://localhost:5003

You can also check the Service Fabric Explorer at: **http://localhost:19080**

---

## Step 5 — Start the Frontend

```bash
cd frontend

# Install dependencies (first run only)
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment Variables

The frontend reads its configuration from a `.env` file in the `frontend/` directory.

Create `frontend/.env` if it does not exist:

```env
VITE_API_BASE_URL=http://localhost:5000
```

> All external URLs **must** be configured here. Do not hardcode addresses in component files.

---

## First Login

### Register a regular user

1. Navigate to http://localhost:5173/register
2. Fill in your name, email, and a password (minimum 6 characters).
3. Click **Register**.

### Register an admin user

Same as above, but enter the admin key in the **Admin Key** field:

```
GuildCoreOverride2024!
```

If the key matches, your account will be created with the **Admin** role, giving you access to the admin dashboard at `/admin`.

> ⚠️ Change the `AdminSecret` value in `appsettings.json` of each service before deploying to any non-local environment.

---

## Project Structure

```
/
├── ApiGateway/              # Reverse proxy — single entry point (port 5000)
│   ├── Controllers/         # Proxy controllers (forward to microservices)
│   ├── Services/            # HttpProxyService
│   └── PackageRoot/         # ServiceManifest.xml
│
├── UserService/             # Auth, JWT, user management (port 5001)
│   ├── Controllers/         # AuthController, UsersController
│   ├── Data/                # UserDbContext, EF migrations
│   ├── DTOs/                # RegisterDto, LoginDto, UserDto, etc.
│   ├── Models/              # User, UserRole
│   └── Services/            # AuthService, JwtService, UserManagementService
│
├── TravelService/           # Travel plans, destinations, activities, expenses, checklist (port 5002)
│   ├── Controllers/         # TravelPlansController, ActivitiesController, etc.
│   ├── Data/                # TravelDbContext, EF migrations
│   ├── DTOs/                # All travel-related DTOs
│   ├── Models/              # TravelPlan, Activity, Expense, etc.
│   └── Services/            # TravelPlanService, ActivityService, etc.
│
├── SharingService/          # Share tokens and QR code access (port 5003)
│   ├── Controllers/         # ShareController
│   ├── Data/                # SharingDbContext, EF migrations
│   ├── DTOs/                # ShareTokenDto, CreateShareTokenDto, etc.
│   ├── Models/              # ShareToken, ShareAccessLevel
│   └── Services/            # SharingTokenService
│
└── frontend/                # React application
    ├── src/
    │   ├── components/      # Layout, ProtectedRoute, AdminRoute, TravelMap, UI components
    │   ├── context/         # AuthContext (global auth state)
    │   ├── hooks/           # useAuth
    │   ├── models/          # TypeScript interfaces (types.ts)
    │   ├── pages/           # Dashboard, PlanDetail, Login, Register, AdminDashboard, etc.
    │   └── services/        # All HTTP service files (authService, travelPlanService, etc.)
    └── .env                 # VITE_API_BASE_URL
```

---

## API Overview

All requests go through the **API Gateway** at `http://localhost:5000`.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login and receive JWT | Public |
| GET | `/api/travel-plans` | Get all plans for logged-in user | User |
| POST | `/api/travel-plans` | Create a new travel plan | User |
| GET | `/api/travel-plans/{id}` | Get full plan details | User |
| PUT | `/api/travel-plans/{id}` | Update a plan | User |
| DELETE | `/api/travel-plans/{id}` | Delete a plan and all its data | User |
| POST | `/api/travel-plans/{id}/destinations` | Add a destination | User |
| POST | `/api/travel-plans/{id}/activities` | Add an activity | User |
| POST | `/api/travel-plans/{id}/expenses` | Add an expense | User |
| POST | `/api/travel-plans/{id}/checklist` | Add a checklist item | User |
| POST | `/api/shares` | Generate a share token | User |
| POST | `/api/shares/validate` | Validate a share token | Public |
| GET | `/api/admin/users` | List all users | Admin |
| PUT | `/api/users/{id}/deactivate` | Deactivate a user | Admin |
| DELETE | `/api/admin/travel-plans/{id}` | Delete any plan | Admin |

---

## Common Issues

**Services not starting after deploy**
- Open **Service Fabric Explorer** at http://localhost:19080 and check service health.
- Verify Docker and SQL Server are running: `docker ps`
- Check that port 1433 is not blocked by a firewall.

**`dotnet ef` command not found**
```bash
dotnet tool install --global dotnet-ef --version 3.1.*
```

**Frontend shows "Could not connect to API"**
- Confirm the API Gateway is running at http://localhost:5000/api/travel-plans (should return 401 without a token).
- Check that `VITE_API_BASE_URL` in `.env` points to the correct gateway port.

**"Login failed" with correct credentials**
- The `Jwt:Key` in `appsettings.json` must be identical across all three services and the gateway. Mismatched keys cause token validation to fail.

---

## Stopping the Application

```bash
# Stop the frontend (Ctrl+C in the terminal running npm run dev)

# Stop and remove the SQL Server container
docker stop sqlserver_travelplanner
docker rm sqlserver_travelplanner
```

To stop the Service Fabric cluster: right-click the tray icon → **Stop Local Cluster**.
