# BuildSense Database Update

## Migration bắt buộc cho backend hiện tại

Chạy theo đúng thứ tự migration của EF Core:

1. `20260712141344_AddTaskIdToMaterialRequest`
2. `20260712141652_AddTaskIdRelationToMaterialRequestTable`
3. `20260712155801_AddProjectBudgetHistoryTable`

Từ thư mục solution backend:

```powershell
dotnet ef database update --project cpms_Infrastructure --startup-project cpms_API
```

Trước khi chạy:

- Backup database local hoặc xác nhận có thể drop/recreate.
- Checkout backend commit `56d8bcf` hoặc mới hơn.
- Kiểm tra connection string đang trỏ đúng database local.

Sau khi chạy, kiểm tra `__EFMigrationsHistory` có đủ ba migration và schema có:

- `MaterialsRequests.TaskId` nullable.
- Index `IX_MaterialsRequests_TaskId`.
- FK `FK_MaterialsRequests_TaskItems_TaskId` tới `TaskItems.TaskId`, delete `Restrict`.
- Bảng `ProjectBudgetHistories`.
- FK `ProjectBudgetHistories.ProjectId` tới `Projects.ProjectId`.
- Index `IX_ProjectBudgetHistories_ProjectId`.

Existing Material Request được giữ nguyên vì `TaskId` nullable. Nếu chưa migrate TaskId, API Material Request có thể lỗi `Invalid column name 'TaskId'`. Nếu chưa migrate budget history, endpoint Adjust Budget/History có thể lỗi thiếu bảng `ProjectBudgetHistories`.

Commit `415b755` và `56d8bcf` không tạo migration riêng; migration budget nằm trong commit `051ff6e`.

## Migration cần thiết kế sau

- Đồng bộ `ProgressReports.ProgressIncrement` giữa request, entity, EF configuration và database; ưu tiên `decimal(5,2)` để khớp UI.
- Unique index `(WarehouseId, MaterialId)` cho `InventoryRecords`.
- Unique index `(TaskId, MaterialId)` cho `TaskMaterialRequirements`.
- Thêm `WarehouseId` hoặc `InventoryRecordId` vào `MaterialRequisitions` để lưu đúng allocation đã reserve.
- Chưa thêm unique `MaterialsRequests.TaskId` cho tới khi chốt có hỗ trợ partial request hay không.
- Cân nhắc FK `ProjectBudgetHistories.UpdatedByUserId` tới UserAccount và delete behavior phù hợp audit.
- Khi hỗ trợ receive PO thực tế, thêm `PurchaseReceipts`, `PurchaseReceiptItems` và `StockMovements`.
