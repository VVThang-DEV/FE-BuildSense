# BuildSense Backend – Danh sách cần sửa

## Ưu tiên 1: Authorization

- Thêm `[Authorize]` và role policy cho Materials, Categories, Suppliers, Catalogs, Warehouses.
- Thêm role policy cho Projects, Tasks, Progress Reports, Material Requests, Purchase Orders.
- PM chỉ truy cập project có `PMUserID` bằng user đang đăng nhập.
- Warehouse Manager review/issue MR, tạo PO và receive PO.
- Supplier chỉ truy cập Supplier record/catalog/PO liên kết với account của mình.
- Customer chỉ truy cập project liên kết và dữ liệu được cho phép.
- Project create bỏ `PMUserID` khỏi request; backend lấy từ JWT.

## Ưu tiên 2: Transaction và validation

- Fix transaction return sớm không rollback trong Create PO và Approve/Reject MR.
- Create Task phải validate toàn bộ material trước khi SaveChanges hoặc transaction toàn bộ.
- Progress phải reject increment vượt remaining; không cap âm thầm về 100.
- Đồng bộ `ProgressIncrement` thành decimal ở request, entity và database.
- Thêm concurrency protection cho progress và inventory.
- MR validate quantity > 0, needed date, duplicate material và project ownership.
- PO validate items không rỗng, quantity > 0, unitPrice >= 0 và duplicate material.
- Thêm unique index `(WarehouseId, MaterialId)`.
- Thêm unique index `(TaskId, MaterialId)` cho task material requirements.

## Ưu tiên 3: Response frontend cần

- Thêm `GET /api/PurchaseOrders/{id}`.
- PO detail trả project, supplier, status, currency và items.
- PO item trả LineItemId, MaterialId, MaterialName, Unit, Quantity, UnitPrice, SubTotal.
- GET PO list trả summary DTO, không trả EF entity trực tiếp.
- Inventory response thêm `InventoryId` và `WarehouseId`.
- Material Request item response thêm `Unit`.
- Material Request detail thêm warehouse/allocation và processed actor/time.

## Ưu tiên 4: ApiResponse và error handling

- Controller trả đúng HTTP 400/403/404/409 thay vì luôn HTTP 200.
- Sửa cách dùng `SetBadRequest` để message nằm trong `ErrorMessage`.
- Exception middleware phải set HTTP status cho mọi nhánh.
- Không trả database inner exception cho client.
- UnitOfWork không rethrow bằng `new Exception(ex.Message)`.
- Chuẩn hóa một response format cho tất cả endpoint.

## Ưu tiên 5: Material Request và Inventory

- MR không được lookup inventory chỉ bằng `MaterialId`.
- MR phải chọn/lưu `WarehouseId` hoặc warehouse allocation cho từng item.
- Approve/Reject phải dùng đúng inventory record đã reserve.

### Phase 2: Nâng cấp nghiệp vụ

- Cho lưu shortage khi stock không đủ thay vì rollback toàn bộ MR.
- Lưu Requested, Reserved, Issued và Shortage quantity.
- Chốt rõ Approve có nghĩa là Issue hay tách thành hai endpoint.
- Thêm Stock Movement history cho issue, receipt và adjustment.

## Ưu tiên 6: Purchase Order

- Đổi Create PO quantity từ int sang decimal.
- Warehouse Manager tạo PO; PM project approve/reject; Warehouse Manager receive.
- Import PO phải kiểm tra warehouse tồn tại.
- Import/receive phải set DeliveryDate.

### Phase 2: Nâng cấp nghiệp vụ

- Link PO item với Material Request shortage hoặc Purchase Requirement.
- Receive theo từng line quantity, không luôn nhập toàn bộ PO.
- Hỗ trợ partial receiving trước khi chuyển DELIVERED.
- Inventory chỉ tăng accepted quantity.
- Tạo receipt/stock movement khi nhập kho.

## Material Planning cần sửa tiếp

- Chốt một flow: tạo Task kèm Materials hoặc cập nhật requirement bằng endpoint riêng.
- Kiểm tra PM sở hữu task/project khi cập nhật requirement.
- Chọn một endpoint material-requirements canonical; hiện có route trùng.
- MRP phải phân biệt Reserved của project hiện tại với Reserved của project khác.
- MRP không được dùng PO của project khác để giảm nhu cầu mua của project hiện tại.
- Chốt `PENDING` PO có thực sự là OnOrder hay chỉ tính từ `APPROVED/ORDERED`.
- MRP trừ vật tư đã issue/cấp cho Task thay vì luôn tính lại toàn bộ Gross của Task chưa hoàn thành.

## Phase 3: Material, Supplier, Customer

- Chuẩn hóa Material Unit thay vì free text tùy ý.
- Cân nhắc cho Material update CategoryId.
- Dùng deactivate/soft delete cho Material và Category đã có transaction.
- Link Supplier account với Supplier entity.
- Thêm `/api/supplier/me` và supplier-scoped PO/catalog.
- Thêm Customer–Project association.
- Thêm customer-safe project/progress endpoint.

## Frontend đã tích hợp tạm thời

- PO reject và status `REJECTED`.
- PO response mới dạng nested Project/Supplier; PO detail hiển thị Items, Unit, UnitPrice và SubTotal.
- Tạo Task kèm `Materials`, xem và cập nhật `TaskResponse.MaterialRequirements`.
- Tạo Material Request trực tiếp từ Task.
- Hiển thị `TaskId` và `Unit` trong Material Request.
- Hiển thị project material requirements và Estimated MRP dạng read-only.
- Hiển thị MRP Unit, OnHand, Reserved, Available, OnOrder và Net Required.
- Create Project gửi `TotalProjectBudget`.
- Project Budget hỗ trợ điều chỉnh tăng/giảm và xem audit history.
- PO vượt budget hiển thị RemainingBudget và CurrentOrder từ structured backend response.
- Warehouse Manager/Admin tạo PO; PM sở hữu project/Admin approve hoặc reject; Warehouse Manager/Admin receive/import.
- Chỉ Admin thấy Adjust Budget; PM xem budget breakdown và adjustment history.
- Budget breakdown tạm tính từ PO: Pending/Reserved, Approved/Committed, Delivered/Actual và Remaining.
- Material/Category/Supplier/Warehouse master-data action chỉ hiển thị cho Admin; PM/Warehouse Manager chỉ xem dữ liệu cần cho nghiệp vụ.

## Giới hạn frontend hiện tại

- Role guard và validation frontend chỉ phục vụ đúng flow demo, có thể bị bypass bằng Swagger/Postman.
- Backend controllers vẫn cần role policy và project ownership checks tương ứng.
- Budget breakdown đang được frontend tổng hợp từ `GET PurchaseOrders`; nên thay bằng backend Budget Status endpoint khi có.
- Chưa có Budget Adjustment Request workflow; PM phải báo Admin thủ công khi budget không đủ.
- Không tự tạo table/column database cho feature backend chưa hỗ trợ vì backend sẽ không đọc dữ liệu đó.

## Backend cần sửa sau khi frontend đã tích hợp

- PO response bổ sung `OrderDate`, `DeliveryDate`, `UserAccountId`; map `SupplierName` từ `Supplier.CompanyName`.
- Thêm `GET /api/PurchaseOrders/{id}` và tách list DTO khỏi detail DTO.
- Chặn tạo nhiều Material Request `PENDING/APPROVED` cho cùng Task hoặc thiết kế partial request rõ ràng.
- Material Request lưu đúng `WarehouseId`/inventory allocation trên từng item; approve/reject dùng đúng record đã reserve.
- MRP allocation theo project/warehouse và trừ vật tư đã issue.
- Đồng bộ ProgressIncrement request/entity/database; reject increment vượt remaining thay vì cap lịch sử sai.
- Fix các nhánh return sớm sau `BeginTransactionAsync()` mà chưa rollback.

## Project Budget cần sửa tiếp

- Backend kiểm tra role/PM ownership cho Adjust Budget và Budget History; frontend role guard không phải security boundary.
- Reject adjustment làm NewBudget âm hoặc thấp hơn tổng PO đang giữ ngân sách.
- Validate `Amount != 0`, Reason bắt buộc và tối đa 500 ký tự ở backend.
- Thêm concurrency protection để hai PO tạo đồng thời không cùng vượt RemainingBudget.
- PO validate quantity > 0 và unitPrice >= 0 ở backend; frontend đã validate nhưng có thể bypass.
- Budget History trả đúng Currency của Project thay vì default VND.
- Thêm FK/audit relation cho `UpdatedByUserId` nếu cần truy ra tên người điều chỉnh.
- Chuẩn hóa lỗi vượt budget vào `ErrorMessage` hoặc error DTO cố định thay vì object tùy biến trong `Result`.
