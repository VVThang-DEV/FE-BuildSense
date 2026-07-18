# BuildSense full-project demo script

This script covers every implemented main workflow in a logical presentation order. It matches the
frontend and the read-only backend copy audited on 2026-07-18.

## 0. Prepare before presenting

Prepare these verified accounts in separate browser profiles or incognito windows:

- `ADMIN`: system setup, access control, budget and inventory approvals.
- `PM`: creates and manages their own projects, tasks, progress, and material requests.
- `WAREHOUSE_MANAGER_A`: manages the central/source warehouse and purchasing.
- `WAREHOUSE_MANAGER_B` (optional): manages a destination warehouse for the transfer demo.

Prepare this business data:

- At least two warehouses with assigned managers.
- One active project owned by the PM with enough budget.
- Two active tasks with material requirements.
- At least two active material variants.
- A supplier with active catalog entries for the variants used in the PO demonstrations.
- Catalog minimum order quantity no higher than the demo quantity. Use lead time `0`, or leave the
  PO expected-delivery date blank.

Before demonstrating task creation, deploy the agreed PM-only backend change. The copied backend
still checks that task assignees are `WORKER`, while the frontend correctly assigns the owning PM.

## 1. Authentication and role-aware navigation

Role: any prepared account.

1. Open the login screen and sign in.
2. Point out that the sidebar changes according to the JWT role.
3. Open **My Profile** from the account menu.
4. Update the name, phone number, or avatar URL and save.
5. Optionally demonstrate change password last, because it signs the user out.

Expected result: the account loads only its authorized navigation. Profile changes preserve the
avatar URL and change-password invalidates the current session.

Optional authentication screens: email verification, resend verification, forgot password, and
reset password. Use prepared verified accounts for the main demonstration so email delivery does not
interrupt it.

## 2. Users and access setup

Role: Admin.

1. Open **Users & Access**.
2. Click **Create account**.
3. Enter identity, email, a strong password, and the intended role.
4. Create one PM and one or two Warehouse Managers if they are not already prepared.
5. Show the user action menu and role update capability.

Expected result: registration creates an account and the frontend immediately promotes it from the
backend's default `CUSTOMER` role to the selected role. The user must be email-verified before normal
business workflows that require a verified account.

Do not create a `WORKER`; it is outside the reduced scope.

## 3. Category setup

Role: Admin.

1. Open **Categories**.
2. Create a category such as `Structural`.
3. Edit its name to demonstrate updates.
4. Avoid deleting a category that already has materials; use an unused demo category if deletion
   needs to be shown.

Expected result: create, update, and delete use the backend's `/api/Categories` controller.

## 4. Material and variant catalog

Role: Admin for mutations; PM and Warehouse Manager can read.

1. Open **Material Catalog**.
2. Create a material with category, default unit, description, and active state.
3. Add a variant with SKU, brand, grade, size, color, specification, packaging, and unit.
4. Edit the material or variant.
5. Show how inactive variants are excluded from operational selectors.

Expected result: the catalog retains extended variant data instead of overwriting omitted response
fields.

Recommended demo variants:

- Cement, 50 kg bag, unit `bag`.
- Rebar D16, unit `ton`.

## 5. Supplier and purchasing catalog setup

Role: Admin.

1. Open **Suppliers**.
2. Add a supplier with company name, email, and phone.
3. Click **Add catalog item**.
4. Select that supplier and one demo material variant.
5. Enter supplier SKU, unit price, minimum order quantity, and lead time.
6. Add a second entry for the other demo variant.

Expected result: the backend can validate that supplier/variant combination during PO creation.

Important limitation: the backend exposes catalog creation but no catalog read endpoint. The
Procurement screen therefore cannot pre-filter suppliers or preview price, minimum, and lead time.
Use a newly created supplier and known catalog values for a predictable demo.

## 6. Warehouse setup

Role: Admin.

1. Open **Warehouses**.
2. Click **New warehouse**.
3. Enter name and location.
4. Select a verified Warehouse Manager by name.
5. Create a second warehouse with the second manager for transfers.

Expected result: Warehouse IDs remain internal; later workflows select warehouses by name.

Suggested warehouses:

- `Central Construction Warehouse` managed by Manager A.
- `Riverside Site Storage` managed by Manager B.

## 7. PM creates a project

Role: PM.

1. Open **Projects**.
2. Click **New project**.
3. Enter name, address, budget, start date, and baseline end.
4. Create the project.
5. Open its detail page.

Expected result: the signed-in PM becomes the project's owner automatically. Initial status is
normally `PLANNING`.

Optional alternate flow: click **Import Word**, upload a `.docx` using the labels shown in the UI,
and let the backend extract the project fields. Demonstrate either manual creation or Word import in
the main presentation, not both unless import is part of the assessment.

## 8. Project lifecycle and ownership

Roles: PM; Admin for reassignment.

1. As PM, open the project and show Overview KPIs: budget, actual cost, tasks, and PM.
2. Edit the project's name, address, or baseline while allowed.
3. Start the project: `PLANNING -> IN_PROGRESS`.
4. Optionally pause and reopen it: `IN_PROGRESS -> PAUSED -> IN_PROGRESS`.
5. As Admin, open the same project and demonstrate PM reassignment only if a spare PM account exists.
6. Leave completion/cancellation until the end because closed projects block operational actions.

Expected result: lifecycle actions use row-version concurrency and ownership checks.

## 9. Project budget

Roles: Admin for adjustment; Admin and owning PM for history.

1. Open the project **Budget** tab.
2. Show the current project budget, PO commitments, and available balance.
3. As Admin, adjust the budget and enter a meaningful reason.
4. Open budget history.
5. As the owning PM, reopen the same tab and show that history is readable.

Expected result: every adjustment records previous value, new value, author, time, and reason.
Warehouse Managers do not request this protected history, avoiding the previous 403.

## 10. Task planning

Role: owning PM.

1. Open the project **Tasks** tab or **Daily Progress** and select the project.
2. Click **New task**.
3. Enter phase, task name, planned budget, baseline dates, and material requirements.
4. Create at least two tasks so full-stock and shortage material flows can be shown independently.
5. Select a task and add another planned material requirement if desired.
6. Edit the task to demonstrate baseline and budget updates.

Expected result: the frontend sends the signed-in PM as assignee; no manual user ID or Worker picker
is exposed.

Suggested tasks:

- `Footing concrete - full allocation`.
- `Structural frame - shortage allocation`.

## 11. Material planning and MRP

Roles: Admin, PM, or Warehouse Manager with their authorized scope.

1. Open the project **Materials** tab.
2. Show gross task requirements, issued quantity, current inventory, reservations, on-order stock,
   and net requirement.
3. Switch between all-warehouse and warehouse-scoped planning when the role allows it.
4. Show any transfer recommendations generated from stock in other warehouses.

Expected result: MRP derives demand from task plans and subtracts issued/project-active supply rather
than requiring manually entered material IDs.

## 12. Daily progress reporting

Role: owning PM.

1. Open **Daily Progress** and select the project, or stay in the project Tasks tab.
2. Select an active task.
3. Enter a positive progress increment that does not exceed the remaining percentage.
4. Enter actual-cost increment, work notes, and optionally a site photo.
5. Submit the report.
6. Approve or reject the pending report.
7. Demonstrate correction or reversal on an approved report if required.

Expected result: approved progress changes task completion and actual cost. With the reduced PM-only
scope, the PM both submits and reviews; this is an intentional separation-of-duties trade-off.

## 13. Full-stock material-request flow

Roles: PM, then Warehouse Manager.

1. As PM, open **Material Requests** and click **New request**.
2. Select the project and the `full allocation` task material plan.
3. Review the prefilled remaining planned quantities and needed-by dates.
4. Submit; status becomes `PENDING`.
5. As Warehouse Manager, filter pending requests and click **Approve**.
6. Select a managed warehouse and approve every item in full.
7. Status becomes `APPROVED`; inventory is reserved.
8. Click **Issue**.
9. Status becomes `ISSUED`; on-hand and reserved stock decrease.

Expected lifecycle:

`PENDING -> APPROVED -> ISSUED`

No PO shortage appears because requested quantity equals approved quantity.

## 14. Partial allocation and shortage creation

Roles: PM, then Warehouse Manager.

1. As PM, create a request for the separate `shortage allocation` task.
2. As Warehouse Manager, approve at least one positive amount but less than the requested amount.
3. For a 10-unit request, approve 4 and leave 6 uncovered.
4. Status becomes `PARTIALLY_APPROVED`.
5. Optionally issue the reserved 4 units; status becomes `PARTIALLY_ISSUED`.

Expected shortage calculation:

`requested - approved warehouse allocation - quantities on active POs`

The shortage remains eligible in either `PARTIALLY_APPROVED` or `PARTIALLY_ISSUED` status.

## 15. Shortage-linked purchase order

Roles: Warehouse Manager, then owning PM or Admin, then Warehouse Manager.

1. As Warehouse Manager, open **Procurement** and click **New PO**.
2. Select **Request shortage**.
3. Select the material-request shortage; project, warehouse, variant, and maximum quantity populate
   automatically.
4. Select the supplier whose catalog entry was prepared earlier.
5. Enter a quantity no greater than the shortage.
6. Leave expected delivery blank for the simplest demo, or respect catalog lead time.
7. Submit; PO status becomes `PENDING`.
8. Sign in as the owning PM or Admin and approve the PO.
9. Sign back in as the Warehouse Manager and click **Ship**.
10. Click **Receive**, enter accepted/damaged/missing quantities, and mark final delivery when needed.

Expected PO lifecycle:

`PENDING -> APPROVED -> SHIPPED -> PARTIALLY_RECEIVED -> DELIVERED`

If the final delivery contains damaged or missing quantities, the terminal status is
`CLOSED_WITH_VARIANCE`.

The shortage path works only when the request item, project, variant, supplier catalog, MOQ, lead
time, remaining budget, and remaining shortage all satisfy backend validation.

## 16. Follow-up request for purchased shortage

Roles: PM, then Warehouse Manager.

1. Finish receiving the shortage PO into the assigned warehouse.
2. As PM, find the original `PARTIALLY_ISSUED` material request.
3. Click **Request remainder**.
4. Confirm creation of a follow-up request from the task's not-yet-issued planned quantity.
5. As Warehouse Manager, approve it against the newly received stock.
6. Issue it.

Expected result: the follow-up request reaches `ISSUED`, and aggregate task demand is fulfilled. The
original request stays `PARTIALLY_ISSUED` for audit history because the backend has no same-request
reallocation operation.

## 17. General warehouse-replenishment PO

Roles: Warehouse Manager, then PM/Admin, then Warehouse Manager.

1. Open **Procurement** and click **New PO**.
2. Select **Stock replenishment**.
3. Select project budget, managed destination warehouse, material variant, supplier, and quantity.
4. Add optional delivery date and note.
5. Submit, then approve as PM/Admin.
6. Ship and receive as Warehouse Manager.

Expected result: inventory increases without a material-request `RequestItemId`. This demonstrates
proactive purchasing separately from project-request shortage fulfilment.

## 18. Procurement monitoring and variance

Roles: Admin, PM, and Warehouse Manager according to their actions.

1. Show Procurement KPI cards and pipeline bar.
2. Use Pending, Approved, Rejected, and Delivered tabs.
3. Open PO details and show creator, approval timestamp, delivery, note, price, and receipt totals.
4. Demonstrate a partial receipt, then finish it.
5. Optionally demonstrate final delivery with damage/missing quantity for
   `CLOSED_WITH_VARIANCE`.

Expected result: active PO quantities disappear from the shortage selector so duplicate ordering is
prevented.

## 19. Warehouse inventory workspace

Roles: Admin read; Warehouse Manager read and operational actions.

1. Open **Warehouses** and select a warehouse by name.
2. Show inventory value, SKU count, low stock, reserved, on-order, and quarantine KPIs.
3. Search for a material or variant.
4. Filter available, low-stock, reserved, on-order, or quarantine items.
5. Open movement history and show PO receipt and material issue transactions.
6. Press **Refresh** and show the last-updated timestamp.

Expected result: inventory IDs remain internal. Data is current-on-fetch/manual refresh, not live
WebSocket streaming.

## 20. Controlled inventory adjustment

Roles: Warehouse Manager, then Admin.

1. As Warehouse Manager, select a managed warehouse and click **Adjust stock**.
2. Select a variant, enter positive or negative delta, reason code, and note.
3. Submit; the adjustment becomes pending rather than silently changing stock.
4. As Admin, open **Inventory Governance -> Adjustments**.
5. Approve or reject with a review note.

Expected result: high-impact stock corrections use dual control and an audit trail.

## 21. Physical count reconciliation

Roles: Warehouse Manager, then Admin.

1. As Warehouse Manager, open **Inventory Governance -> Physical counts**.
2. Select a managed warehouse and start a full count.
3. Enter actual quantities for each line.
4. Submit for approval.
5. As Admin, review variances and approve or reject with a note.

Expected lifecycle:

`DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED`

## 22. Material return

Role: Warehouse Manager.

1. Open **Warehouses**, select the warehouse, and click **Record return**.
2. Select an eligible issued material request by label.
3. Select its issued material item.
4. Enter a quantity no greater than the remaining returnable amount.
5. Select reason and condition, add a note, and submit.

Expected result: usable returns increase available stock; damaged/quarantine outcomes follow backend
condition rules. No request or item ID is typed manually.

## 23. Warehouse transfer

Roles: source Warehouse Manager, destination Warehouse Manager, then source and destination again.

1. As source manager, open **Warehouse Transfers** and create a transfer.
2. Select source warehouse, destination warehouse, material variant, quantity, and note.
3. As destination manager, approve the `REQUESTED` transfer.
4. As source manager, ship the `APPROVED` transfer.
5. As destination manager, receive the `IN_TRANSIT` transfer.
6. Reconcile accepted, damaged, and lost quantities.
7. Open Details and show the actor/timestamp audit trail.

Expected lifecycle:

`REQUESTED -> APPROVED -> IN_TRANSIT -> RECEIVED`

If one manager owns both warehouses, that account can demonstrate all stages, but two managers make
the authorization model clearer.

## 24. Role-specific dashboards

Roles: Admin, PM, and Warehouse Manager.

Run this after the operational workflows so the charts contain meaningful data.

1. As Admin, show project, procurement, warehouse, supplier, and user summaries.
2. As PM, show owned-project health, budgets, task progress, and PO follow-up.
3. As Warehouse Manager, show stock analytics, low-stock risk, PO queue, and inventory watchlist.
4. Use dashboard links to navigate into the underlying records.

Expected result: queries and visualizations change according to role rather than exposing every API
to every user.

## 25. Authorization demonstration

Use this as a short security proof, not as the main flow.

1. As Warehouse Manager, confirm there is no Users & Access or Categories navigation.
2. Confirm the Warehouse Manager cannot adjust project budget or fetch budget history.
3. As PM, confirm warehouse governance mutations are unavailable.
4. As Admin, confirm project task creation/report submission controls are not shown as PM actions.
5. Navigate using normal UI links rather than typing protected URLs.

Expected result: frontend navigation matches controller authorization, while backend ownership checks
remain authoritative.

## 26. Project closure

Roles: owning PM or Admin.

1. Verify tasks, reports, material requests, and POs are in the desired final state.
2. Open project detail.
3. Click **Complete project** and confirm.
4. Show that closed projects reject new operational activity.

Use cancellation only as an alternate negative path. Reopen is available for eligible paused or
cancelled projects according to backend lifecycle rules.

## 27. Features not to present as implemented

The following routes intentionally render a backend-unavailable page because corresponding backend
workflows are absent:

- Customer Portal.
- AI Agent/chat.
- General Reports.
- Attendance.
- Today on Site.
- Daily Check.
- Inventory Thresholds.
- WBS & Baseline standalone module.
- Notification Rules.

The Supplier role also has profile access but no supplier-specific PO portal. These should be
described as out of the reduced scope, not demonstrated as completed functionality.

## Recommended live presentation order

For a 20-30 minute demonstration, use this compressed sequence:

1. Admin setup and role navigation.
2. PM project, task, material plan, and progress.
3. Full-stock material request.
4. Partial material request and shortage PO.
5. PO approval, shipment, and receipt.
6. Follow-up remainder request.
7. General stock-replenishment PO.
8. Warehouse inventory, return, and transfer.
9. Adjustment and physical-count governance.
10. Role dashboards, budget history, and authorization summary.
