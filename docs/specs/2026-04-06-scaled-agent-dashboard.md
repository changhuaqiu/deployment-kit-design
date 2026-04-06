# Scaled Multi-Agent Integration Design: "Construction Company" Dashboard

## 1. Goal
To completely redesign the right-side panel of the 2D City Builder HUD, moving from a manual "Tools Palette" to a fully autonomous, scaled-up "Agent Dashboard" (inspired by `gastown`'s Polecats, Deacons, and Refinery).

The user (Mayor/包工头) no longer manually places buildings. Instead, the user dispatches teams of agents to perform scans, detect drift, and generate IaC, managing the flow entirely through approval gates (Refinery).

## 2. Concept Mapping (gastown -> 建筑公司 Dashboard)

| gastown Concept | Dashboard Metaphor | UI Representation |
| :--- | :--- | :--- |
| **Polecats (Workers)** | **动态施工队 (Dynamic Worker Pool)** | Automatically scaling list of worker cards (e.g., 🕵️ Scanner-01, 🕵️ Scanner-02, 👨‍🎨 Generator-03) appearing in the dashboard when tasks are dispatched. |
| **Deacon / Witness** | **👮 质检主管 / 安检员** | Fixed, top-level supervisor. Monitors health, drift severity, and policy violations. |
| **Refinery / Queue** | **📥 质检台 (Merge/Approve Queue)** | A dedicated section at the top of the dashboard holding pending "Blueprints" (Beads) awaiting the Mayor's signature. |
| **Beads / Hooks** | **📜 工程台账 (Logs/Ledger)** | Clickable details on any worker or queue item sliding out from the left. |

## 3. UI/UX Layout Updates (`CityHudMap.tsx`)

### 3.1 Removing the Manual Tools
*   **DELETE:** The 🏗️ TOOLS section (Service, Vault, Road, etc.) will be completely removed.
*   **REASON:** The city's state is entirely driven by the Agent's scans (Inventory) and the resulting IaC (Artifacts/Resources).

### 3.2 The New Right-Side Dashboard (`AgentOfficePanel.tsx`)
The right-side panel will now take up the full height of the screen (minus margins) and be slightly wider (e.g., `w-[160px]` or `w-[180px]`) to accommodate more information.

**Layout Structure (Top to Bottom):**

1.  **Header:** `🏢 建筑公司总控` (Town Workspace Dashboard)
2.  **Supervisor & Refinery Zone (Fixed at top):**
    *   **👮 质检主管 (Deacon):** Status (e.g., `💭 审查中`, `Zzz 待命`).
    *   **📥 质检台 (Queue):** Number of pending items. If > 0, a pulsing `🟨 签字审批` button appears.
3.  **Divider:** `--- 施工现场 ---`
4.  **Dynamic Worker Pool (Scrollable list):**
    *   This area shows *all* active and recently active Polecats.
    *   When the user clicks "🔭 普查" (Scan), instead of 1 agent working, we simulate spawning 3-5 agents (e.g., scanning different districts concurrently).
    *   **Worker Card:**
        *   Icon + ID (e.g., `🕵️ 普查-A1`)
        *   Status (e.g., `🔨 扫描网络街区...`)
        *   Progress bar (optional, or just a spinner).
    *   Once an agent finishes, their card turns `✅ 完成` and fades out or moves to a "recent" list, passing their payload to the Refinery.

## 4. Data Flow (Dynamic Spawning from External Source)

We need to update `deployStore.ts` to handle dynamic agent spawning, reflecting the reality that these workers are external sub-agents (e.g., from OpenCode or `deploy-kit` skills).

1.  **Agent Source of Truth:**
    *   The `agents` list in the store is no longer static. It acts as a projection of active sub-agents.
    *   When an action is triggered (e.g., "Scan"), the system simulates receiving a dispatch manifest from the external orchestrator, spawning a batch of agents.
2.  **Action: `dispatchAgents` (replaces `triggerAgentTask`)**
    *   Accepts a list of sub-agent definitions (ID, role, name, task).
    *   Pushes these new `WorkerAgent` objects to the store with status `working`.
3.  **Execution Simulation:**
    *   Set timeouts for each agent independently (e.g., 1500ms, 2200ms, 3000ms) to simulate asynchronous sub-agent completion.
    *   As each finishes, they log their payload to the Ledger, status changes to `done`.
4.  **Handoff to Refinery:**
    *   When the *last* agent in the batch finishes, the `refineryQueue` increments by 1.
    *   The `Deacon` (Supervisor) agent activates, checks the payload, and flags it for approval.

## 5. Review & Self-Check
- [x] Does it remove manual tools? Yes, completely focuses on Agent orchestration.
- [x] Does it scale to many agents? Yes, the dynamic list and scrolling area support dozens of concurrent workers (Polecats).
- [x] Is the Refinery concept prominent? Yes, fixed at the top as the ultimate gatekeeper.
- [x] Is the data flow clear? Yes, dynamic spawning -> independent completion -> aggregated handoff to Refinery -> Mayor approval.