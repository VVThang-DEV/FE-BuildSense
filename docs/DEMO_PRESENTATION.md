# Kịch bản thuyết trình và demo BuildSense

> Bản lời nói chi tiết để đọc theo khi demo: [DEMO_SPEAKER_SCRIPT.md](./DEMO_SPEAKER_SCRIPT.md)

## 1. Cách giới thiệu hệ thống

> BuildSense là hệ thống hỗ trợ quản lý dự án xây dựng, kết nối kế hoạch công việc, tiến độ thi công, nhu cầu vật tư, tồn kho, mua hàng và ngân sách dự án. Trong phiên bản hiện tại, luồng nghiệp vụ chính đi qua ba actor: Project Manager, Warehouse Manager và Admin.

Không nên giới thiệu đây là hệ thống kế toán hoặc ERP hoàn chỉnh. Trọng tâm hiện tại là:

- PM lập kế hoạch và phát sinh nhu cầu vật tư.
- Warehouse Manager kiểm tra và xử lý vật tư trong kho.
- Khi thiếu vật tư, Warehouse Manager tạo Purchase Order.
- PM duyệt hoặc từ chối PO của project mình phụ trách.
- Warehouse Manager nhận hàng và cập nhật tồn kho.
- Admin quản lý dữ liệu nền, tài khoản và hạn mức ngân sách.

## 2. Actor và trách nhiệm hiện tại

| Actor | Chức năng nên trình bày | Không nên nói quá phạm vi |
|---|---|---|
| Project Manager | Tạo project, task và kế hoạch vật tư; cập nhật Daily Progress; tạo/theo dõi Material Request; xem MRP và ngân sách; approve/reject PO thuộc project | Không quản lý kho, không tạo dữ liệu nền, không trực tiếp nhập hàng |
| Warehouse Manager | Xem tồn kho; approve/reject Material Request; tạo PO khi cần mua thêm; import PO đã duyệt vào warehouse | Không tạo project/task, không điều chỉnh ngân sách, không duyệt PO thay PM |
| Admin | Quản lý user, category, material, supplier, catalog và warehouse; xem toàn bộ project/progress; điều chỉnh budget và xem audit history | Khi demo nghiệp vụ chính, không dùng Admin để thay PM/Warehouse Manager dù UI đang có một số quyền dự phòng |
| Supplier | Hiện mới có dữ liệu supplier và catalog để dùng khi tạo PO | Chưa có supplier portal, supplier-scoped PO, quotation response hoặc delivery update hoàn chỉnh |
| Customer | Role được giữ lại cho phạm vi sản phẩm | Customer Portal hiện chưa có backend endpoint nên chưa phải flow có thể demo |

## 3. Luồng nghiệp vụ tổng thể

```text
Admin chuẩn bị master data
        ↓
PM tạo Project → Task + Material Requirements → cập nhật Progress
        ↓
PM tạo Material Request từ Task
        ↓
Warehouse Manager kiểm tra tồn kho
        ├─ Đủ hàng: Approve MR → vật tư được xử lý/xuất kho
        └─ Thiếu hàng: tạo PO cho Supplier
                         ↓
                   PM Approve/Reject PO
                         ↓
                   Warehouse nhận PO đã duyệt
                         ↓
                   Inventory và trạng thái PO được cập nhật
```

Ngân sách đi song song với PO:

```text
PENDING PO   → Pending / Reserved
APPROVED PO  → Approved / Committed
DELIVERED PO → Delivered / Actual
REJECTED PO  → Không giữ ngân sách
```

## 4. Kịch bản demo đề xuất

### Bước 0 — Mở đầu bằng Admin (1–2 phút)

Thao tác:

1. Đăng nhập Admin.
2. Mở `Material Catalog`, `Categories`, `Suppliers` và `Warehouses`.
3. Chỉ lướt nhanh để chứng minh dữ liệu nền đã có: material có category và unit, supplier có catalog/unit price, warehouse có inventory.
4. Mở `Users & Access` để nói hệ thống phân tách actor theo role.

Lời trình bày:

> Trước khi dự án vận hành, Admin chuẩn bị dữ liệu dùng chung gồm tài khoản, danh mục vật tư, đơn vị tính, nhà cung cấp và kho. Các role nghiệp vụ sử dụng dữ liệu này nhưng không tự ý thay đổi master data.

Không nên tạo mới quá nhiều dữ liệu trong lúc demo. Hãy chuẩn bị sẵn category, material, supplier, catalog và warehouse trước buổi trình bày.

### Bước 1 — PM tạo project và task (3 phút)

Thao tác:

1. Đăng nhập Project Manager.
2. Vào `Projects` → `New project`.
3. Nhập tên, địa điểm, ngày bắt đầu, baseline end và total project budget.
4. Mở project vừa tạo.
5. Tạo task với phase, task name, baseline dates, planned budget và material requirements.
6. Chỉ vào Project Progress, task board và WBS timeline.

Lời trình bày:

> Project Manager là người lập và sở hữu kế hoạch dự án. Khi tạo task, PM khai báo luôn nhu cầu vật tư dự kiến. Dữ liệu task này là đầu vào cho Material Planning và phép tính MRP của project.

Điểm nhấn:

- Material có cả quantity và unit, ví dụ `100 bao`, `20 m³` hoặc `500 kg`.
- PM hiện tự quản lý task vì Site Staff không nằm trong scope hiện tại.
- Admin xem được project nhưng không có nút tạo project/task hoặc cập nhật progress.

### Bước 2 — PM cập nhật Daily Progress (2 phút)

Thao tác:

1. Từ project detail hoặc `Daily Progress`, mở một task.
2. Nhập progress increment, notes và ảnh nếu Cloudinary đã được cấu hình.
3. Submit report.
4. Cho xem progress mới, task status và report history.

Lời trình bày:

> Progress được nhập theo phần tăng thêm trong ngày, không ghi đè lịch sử cũ. Frontend kiểm tra increment không được vượt phần trăm còn lại. Khi task đạt 100%, form cập nhật được khóa nhưng lịch sử vẫn được giữ lại.

Nếu Cloudinary chưa chắc chắn hoạt động, chỉ demo notes và progress; dùng report có ảnh đã chuẩn bị trước để giới thiệu phần xem ảnh.

### Bước 3 — PM xem kế hoạch vật tư và tạo Material Request (2 phút)

Thao tác:

1. Trong project detail, kéo xuống `Material plan`.
2. Giải thích Gross, On hand, Reserved, Available, On order và To buy.
3. Mở task detail → tạo Material Request từ task; hoặc vào `Material Requests` và tạo request thủ công.
4. Mở danh sách để cho thấy request đang ở trạng thái `PENDING`.

Lời trình bày:

> Material plan tổng hợp nhu cầu từ các task. MRP so sánh nhu cầu với tồn kho, lượng đã reserve và lượng đang đặt mua để đưa ra số lượng cần mua dự kiến. Sau đó PM tạo Material Request để Warehouse Manager xử lý.

Phải gọi đây là **Estimated MRP** vì backend hiện chưa phân bổ reserved/on-order chính xác theo từng project và chưa trừ vật tư đã issue khỏi gross demand.

### Bước 4 — Warehouse Manager xử lý Material Request (2 phút)

Thao tác:

1. Đăng nhập Warehouse Manager.
2. Vào `Material Requests`; mặc định tập trung vào request `PENDING`.
3. Mở Details để kiểm tra project, task, material, unit, quantity và needed date.
4. Approve một request đủ tồn kho.
5. Nếu muốn demo reject, sử dụng một request khác và chọn Reject.
6. Mở `Warehouses` để xem inventory.

Lời trình bày:

> Warehouse Manager là người kiểm tra yêu cầu thực tế với tồn kho. Approve hiện mang nghĩa xử lý/xuất lượng đã reserve; Reject giải phóng lượng reserve. PM chỉ theo dõi kết quả, không tự duyệt yêu cầu của mình.

Không dùng request thiếu tồn kho cho happy-path vì backend hiện rollback toàn bộ thay vì lưu shortage riêng.

### Bước 5 — Warehouse Manager tạo Purchase Order (2 phút)

Thao tác:

1. Trong tài khoản Warehouse Manager, vào `Procurement` → `New PO`.
2. Chọn project, supplier, material, quantity và unit price.
3. Tạo PO và cho thấy trạng thái `PENDING`.
4. Mở Details để chỉ ra project, supplier, item, unit, unit price, subtotal và total.

Lời trình bày:

> Khi cần bổ sung vật tư, Warehouse Manager tạo PO gắn với project và supplier. PO mới ở trạng thái Pending để PM của project kiểm soát quyết định chi ngân sách.

Phiên bản hiện tại của form chỉ tạo một PO line mỗi lần. Không giới thiệu quotation comparison hoặc tự động tạo PO từ shortage vì backend chưa hỗ trợ.

### Bước 6 — PM duyệt hoặc từ chối PO (2 phút)

Thao tác:

1. Đăng nhập lại Project Manager.
2. Vào `Procurement` và mở PO thuộc project của PM.
3. Approve PO happy-path.
4. Nếu cần thể hiện reject, chuẩn bị PO thứ hai và Reject PO đó.
5. Quay lại project detail để xem budget breakdown.

Lời trình bày:

> PM chỉ nhìn thấy PO thuộc project mình phụ trách. PM có thể approve hoặc reject để kiểm soát nhu cầu mua và ngân sách. Pending được xem là reserved, Approved là committed, Rejected không tiếp tục giữ ngân sách.

Có thể demo thêm validation bằng một PO vượt remaining budget. Hệ thống sẽ hiển thị remaining budget và giá trị current order, nhưng chỉ nên làm sau khi happy-path đã hoàn tất.

### Bước 7 — Warehouse Manager nhận hàng (1–2 phút)

Thao tác:

1. Đăng nhập Warehouse Manager.
2. Mở PO `APPROVED` trong `Procurement`.
3. Chọn Import/Receive và warehouse nhận hàng.
4. Xác nhận PO chuyển thành `DELIVERED`.
5. Mở warehouse inventory để cho thấy số lượng được cập nhật.

Lời trình bày:

> Warehouse Manager chỉ nhập kho PO đã được PM duyệt. Khi import thành công, PO chuyển sang Delivered và inventory được tăng tại warehouse đã chọn.

Hiện backend nhận toàn bộ PO trong một lần; chưa hỗ trợ partial receiving, accepted/defective quantity hoặc receipt line riêng.

### Bước 8 — Admin điều chỉnh và audit ngân sách (1–2 phút)

Thao tác:

1. Đăng nhập Admin.
2. Mở project vừa demo.
3. Cho xem budget breakdown và adjustment history.
4. Chọn `Adjust budget`, nhập số tiền tăng/giảm và reason.
5. Submit và cho thấy history record mới.

Lời trình bày:

> Admin quản lý hạn mức ngân sách, còn PM kiểm soát chi tiêu thông qua approve/reject PO. Mỗi lần Admin điều chỉnh đều lưu previous budget, amount changed, new budget, người cập nhật và lý do để audit.

Nhấn mạnh: Budget History ghi thay đổi **hạn mức ngân sách**, không phải lịch sử chi tiêu. Chi tiêu hiện được frontend tổng hợp từ trạng thái PO.

## 5. Thứ tự tài khoản tối ưu khi demo

1. **Admin:** giới thiệu master data đã chuẩn bị.
2. **PM:** tạo project, task, progress và Material Request.
3. **Warehouse Manager:** approve MR và tạo PO.
4. **PM:** approve/reject PO.
5. **Warehouse Manager:** import PO vào kho.
6. **Admin:** xem toàn bộ và điều chỉnh/audit budget.

Không đăng nhập Supplier hoặc Customer trong happy-path chính vì hai portal này chưa hoàn thiện.

## 6. Dữ liệu cần chuẩn bị trước buổi demo

- Một tài khoản Admin, một PM và một Warehouse Manager đã đăng nhập thử thành công.
- Một category và ít nhất hai material có unit rõ ràng.
- Một supplier và catalog/unit price tương ứng.
- Một warehouse có tồn kho cho material dùng trong MR.
- Một project cũ có dữ liệu để dự phòng nếu create project lỗi.
- Một task chưa có Material Request để demo create-from-task.
- Hai PO `PENDING` nếu muốn demo cả Approve và Reject.
- Một PO `APPROVED` dự phòng để demo import/receive.
- Budget đủ lớn cho PO happy-path.
- Migration trong `DATABASE_UPDATE.md` đã chạy và kiểm tra trong `__EFMigrationsHistory`.

## 7. Những giới hạn cần nói trung thực khi được hỏi

- Frontend đã ẩn action theo role, nhưng backend vẫn phải hoàn thiện authorization/project ownership để chống gọi trực tiếp bằng Swagger/Postman.
- MRP hiện là estimate; allocation theo project/warehouse và issued quantity còn phải sửa ở backend.
- Material Request chưa lưu warehouse allocation chi tiết và chưa hỗ trợ partial shortage.
- PO chưa liên kết trực tiếp với shortage/MR, chưa có nhiều line trên form và chưa partial receive.
- Budget breakdown đang được frontend tính từ danh sách PO, chưa có Budget Status endpoint riêng.
- Supplier chưa có account-to-supplier mapping và supplier portal thực tế.
- Customer Portal chưa có backend endpoint và quy trình approved/curated content.
- Admin adjustment hiện là direct adjustment; chưa có workflow PM gửi yêu cầu để Admin duyệt.

## 8. Câu kết thúc bài demo

> Luồng hiện tại đã kết nối được kế hoạch thi công với nhu cầu vật tư, tồn kho, mua hàng và ngân sách theo trách nhiệm của từng role. Phần frontend đã thể hiện đầy đủ happy-path chính. Các bước tiếp theo tập trung vào backend authorization, inventory allocation, partial receiving và supplier/customer portal để nghiệp vụ sát thực tế hơn.
