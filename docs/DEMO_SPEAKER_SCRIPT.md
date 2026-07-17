# Kịch bản lời nói khi demo BuildSense

Thời lượng đề xuất: 12–15 phút. Nội dung trong dấu `[]` là thao tác trên website, không cần đọc thành tiếng.

## 1. Mở đầu

> Em xin trình bày BuildSense, một hệ thống hỗ trợ quản lý dự án xây dựng. Vấn đề nhóm muốn giải quyết là dữ liệu tiến độ, nhu cầu vật tư, tồn kho, mua hàng và ngân sách thường nằm ở nhiều bộ phận khác nhau. BuildSense kết nối các bước đó thành một luồng thống nhất và phân quyền theo trách nhiệm của từng actor.
>
> Trong phiên bản hiện tại, ba actor chính tham gia trực tiếp vào luồng nghiệp vụ là Project Manager, Warehouse Manager và Admin. Project Manager lập kế hoạch và kiểm soát dự án. Warehouse Manager xử lý vật tư, tồn kho và mua hàng. Admin quản lý dữ liệu nền, tài khoản và hạn mức ngân sách.
>
> Em sẽ demo theo một luồng xuyên suốt: bắt đầu từ project và task, phát sinh nhu cầu vật tư, xử lý Material Request, tạo và duyệt Purchase Order, sau đó nhận hàng vào kho và kiểm tra ngân sách.

## 2. Admin chuẩn bị dữ liệu nền

`[Đăng nhập Admin và mở Dashboard]`

> Đầu tiên là tài khoản Admin. Dashboard cho Admin góc nhìn tổng quan để theo dõi hệ thống. Admin không phải người trực tiếp lập kế hoạch hay cập nhật tiến độ dự án.

`[Mở Categories và Material Catalog]`

> Trước khi vận hành, Admin chuẩn bị master data. Material được quản lý theo category và mỗi material có đơn vị tính riêng, ví dụ xi măng theo bao, thép theo kilogram hoặc bê tông theo mét khối. Đơn vị này được sử dụng xuyên suốt khi lập kế hoạch vật tư, tạo Material Request, Purchase Order và xem tồn kho.

`[Mở Suppliers]`

> Admin cũng quản lý danh sách supplier và supplier catalog. Catalog liên kết supplier với material, đơn giá và lead time để phục vụ nghiệp vụ mua hàng.

`[Mở Warehouses và xem một inventory]`

> Tại đây Admin tạo thông tin kho và có thể xem tồn kho hiện tại. Sau khi dữ liệu nền sẵn sàng, các actor nghiệp vụ sẽ sử dụng chung nguồn dữ liệu này.

> Tiếp theo em sẽ chuyển sang Project Manager để bắt đầu luồng dự án.

## 3. PM tạo project

`[Đăng nhập PM → Projects → New project]`

> Project Manager là người tạo và chịu trách nhiệm cho project của mình. Khi tạo project, PM nhập tên dự án, địa điểm, ngày bắt đầu, baseline end và tổng ngân sách.

`[Điền dữ liệu và bấm Create]`

> Sau khi tạo, project được liên kết với PM hiện tại. Mục tiêu nghiệp vụ là mỗi PM chỉ quản lý các project được giao cho mình, còn Admin có quyền xem toàn bộ để giám sát.

`[Mở project detail]`

> Project detail tập trung các thông tin quan trọng gồm timeline, người phụ trách, ngân sách, task, tiến độ và kế hoạch vật tư.

## 4. PM tạo task và kế hoạch vật tư

`[Kéo đến Create project task]`

> Trong mỗi project, PM chia công việc thành phase và task. Ở task này em nhập tên công việc, thời gian baseline và planned budget.

`[Thêm material requirement vào task]`

> Điểm mới là PM có thể khai báo vật tư cần thiết ngay khi lập task. Ví dụ task này cần một trăm bao xi măng. Quantity luôn đi cùng unit lấy từ Material Catalog nên người dùng biết con số đang đại diện cho bao, kilogram hay mét khối.

`[Bấm Create task]`

> Sau khi tạo, task xuất hiện trên task board và WBS timeline. Hệ thống đồng thời sử dụng material requirement làm đầu vào cho phần Material Planning.

## 5. PM cập nhật Daily Progress

`[Mở task detail]`

> Trong scope hiện tại không còn Site Staff, vì vậy PM là người trực tiếp cập nhật Daily Progress. Khi mở task, PM thấy tiến độ hiện tại, phần trăm còn lại và toàn bộ lịch sử báo cáo.

`[Nhập progress increment và notes]`

> Tiến độ được nhập theo increment, tức là phần hoàn thành thêm trong lần báo cáo này. Ví dụ task đang ở hai mươi phần trăm, hôm nay hoàn thành thêm mười phần trăm thì PM nhập mười, không nhập lại ba mươi.

`[Bấm Submit report]`

> Frontend kiểm tra increment không được lớn hơn phần trăm còn lại. Mỗi lần submit tạo một report mới, nhờ đó lịch sử không bị ghi đè. Khi task đạt một trăm phần trăm, form cập nhật được khóa nhưng lịch sử vẫn có thể xem lại.

`[Nếu có ảnh đã chuẩn bị, mở ảnh report]`

> Progress report cũng hỗ trợ notes và site photo để bổ sung bằng chứng thực tế tại công trường.

## 6. PM xem Material Planning và MRP

`[Kéo xuống Material plan và Estimated MRP]`

> Từ material requirement của các task, hệ thống tổng hợp Material Plan cho toàn project. Bảng này cho biết tổng nhu cầu của từng material và task nào phát sinh nhu cầu đó.

> Phần Estimated MRP so sánh Gross Requirement với On Hand, Reserved, Available và On Order để ước tính To Buy. Ví dụ nếu cần một trăm đơn vị nhưng chỉ còn hai mươi đơn vị khả dụng thì hệ thống cho thấy phần còn thiếu cần mua thêm.

> Em nhấn mạnh đây đang là Estimated MRP. Backend hiện đã trả các thành phần tính toán, nhưng bước phân bổ reserved và on-order theo từng project, warehouse và lượng đã issue vẫn cần hoàn thiện để phù hợp nghiệp vụ thực tế hơn.

## 7. PM tạo Material Request

`[Mở lại task detail → Create Material Request]`

> Khi task cần vật tư thực tế, PM tạo Material Request trực tiếp từ task. Cách này giúp giữ liên kết giữa nhu cầu vật tư và công việc đã lập kế hoạch, thay vì tạo một yêu cầu không có nguồn gốc.

`[Chuyển sang trang Material Requests]`

> Request mới có trạng thái Pending. PM có thể xem project, task, material, quantity, unit và needed date, nhưng PM không tự duyệt yêu cầu do chính mình tạo.

> Tiếp theo em chuyển sang Warehouse Manager để xử lý yêu cầu này.

## 8. Warehouse Manager xử lý Material Request

`[Đăng nhập Warehouse Manager → Material Requests]`

> Warehouse Manager nhìn thấy hàng đợi các Material Request đang chờ xử lý. Trước khi quyết định, Warehouse Manager mở detail để kiểm tra vật tư, số lượng, đơn vị và ngày cần hàng.

`[Mở Details của request]`

> Nếu tồn kho đáp ứng được, Warehouse Manager approve request. Trong backend hiện tại, approve đồng thời mang nghĩa xử lý lượng vật tư đã reserve và xuất cho yêu cầu.

`[Approve request đủ tồn kho]`

> Request đã chuyển sang Approved. Nếu yêu cầu không hợp lệ, Warehouse Manager có thể Reject; khi đó lượng đã reserve được giải phóng.

`[Nếu có request dự phòng, chỉ vào nút Reject nhưng không nhất thiết bấm]`

> Phiên bản hiện tại xử lý request theo toàn bộ yêu cầu. Partial issue và lưu shortage riêng là phần backend cần phát triển tiếp.

## 9. Warehouse Manager tạo Purchase Order

`[Mở Procurement → New PO]`

> Khi tồn kho không đủ hoặc cần bổ sung hàng, Warehouse Manager tạo Purchase Order. Đây là sự phân tách trách nhiệm: Warehouse Manager xác định nhu cầu mua, nhưng PM là người quyết định duyệt chi cho project.

`[Chọn project, supplier, material; nhập quantity và unit price]`

> PO liên kết với project, supplier và material. Hệ thống tính subtotal của line item và total amount của đơn hàng. Nếu PO vượt ngân sách còn lại, backend trả thông tin remaining budget và current order để frontend thông báo rõ cho người dùng.

`[Bấm Create PO và mở PO Details]`

> PO mới được tạo ở trạng thái Pending. Trong detail có project, supplier, material, unit, quantity, unit price, subtotal và total. Pending PO được xem là đang giữ trước một phần ngân sách trong phần hiển thị budget.

> Bây giờ em chuyển lại cho PM để thực hiện bước phê duyệt.

## 10. PM duyệt hoặc từ chối PO

`[Đăng nhập PM → Procurement]`

> PM chỉ nên xem và xử lý PO thuộc project mình phụ trách. PM kiểm tra nhu cầu, supplier, số lượng và tổng giá trị trước khi quyết định.

`[Mở PO Details → Approve]`

> Khi PM approve, PO chuyển từ Pending sang Approved. Trong budget breakdown, giá trị này chuyển từ Pending hoặc Reserved sang Approved hoặc Committed.

`[Chỉ vào một PO Pending khác → Reject]`

> Nếu PO không hợp lý, PM có thể reject. Rejected PO không thể approve hoặc nhập kho và không tiếp tục giữ ngân sách.

> Việc để PM duyệt PO giúp PM kiểm soát chi phí của project, còn Warehouse Manager vẫn chịu trách nhiệm về hoạt động kho và mua hàng.

## 11. Warehouse Manager nhận hàng vào kho

`[Đăng nhập Warehouse Manager → Procurement → Approved]`

> Sau khi PO được PM duyệt và hàng được giao, Warehouse Manager chọn PO Approved và warehouse thực tế nhận hàng.

`[Bấm Import/Receive → chọn warehouse → xác nhận]`

> Khi import thành công, PO chuyển sang Delivered và inventory tại warehouse được tăng lên. Trong ngân sách, giá trị này được hiển thị ở nhóm Delivered hoặc Actual.

`[Mở Warehouses và xem inventory]`

> Như vậy dữ liệu đã đi hết vòng từ nhu cầu của task, qua Material Request và Purchase Order, cuối cùng trở thành tồn kho có thể theo dõi trong hệ thống.

> Backend hiện nhận toàn bộ PO trong một lần. Partial receiving, kiểm tra accepted quantity và defect quantity là hướng phát triển tiếp theo.

## 12. Admin kiểm tra ngân sách và audit

`[Đăng nhập Admin → Projects → mở project vừa demo]`

> Cuối cùng em quay lại Admin. Admin có thể xem toàn bộ project để giám sát nhưng không trực tiếp cập nhật task hoặc Daily Progress.

`[Kéo đến Project budget]`

> Budget panel gồm Total Budget, Pending Reserved, Approved Committed, Delivered Actual và Remaining. Hiện các giá trị chi tiêu được frontend tổng hợp từ trạng thái PO.

`[Bấm Adjust Budget]`

> Chỉ Admin nhìn thấy chức năng Adjust Budget. Admin nhập một khoản tăng hoặc giảm và bắt buộc cung cấp reason.

`[Nhập dữ liệu và Submit]`

> Sau khi cập nhật, hệ thống lưu audit history gồm previous budget, amount changed, new budget, người cập nhật và lý do. Budget History này theo dõi thay đổi hạn mức ngân sách, không phải lịch sử chi tiêu; lịch sử chi tiêu hiện được thể hiện qua PO.

## 13. Supplier và Customer

> Hệ thống vẫn giữ hai actor Supplier và Customer trong định hướng sản phẩm. Tuy nhiên trong phiên bản hiện tại, Supplier mới được quản lý dưới dạng supplier record và catalog phục vụ PO. Chưa có account mapping và supplier portal hoàn chỉnh.
>
> Customer Portal cũng đang chờ backend cung cấp project association và customer-safe progress endpoint. Vì vậy nhóm không trình bày hai phần này như chức năng đã hoàn thành.

## 14. Kết thúc

> Qua phần demo, BuildSense đã kết nối được các bước chính: PM lập task và nhu cầu vật tư, Warehouse Manager xử lý yêu cầu và tạo PO, PM kiểm soát phê duyệt, Warehouse Manager nhận hàng, còn Admin quản lý dữ liệu nền và ngân sách.
>
> Điểm nhóm đã cải thiện là dữ liệu không còn dừng ở một danh sách đơn giản. Task đã liên kết với material requirement, Material Request liên kết với task, PO có item, đơn vị, giá và trạng thái, còn ngân sách phản ánh vòng đời của PO.
>
> Những phần cần hoàn thiện tiếp nằm chủ yếu ở backend, gồm authorization theo role và project ownership, inventory allocation, shortage, partial receiving và portal riêng cho Supplier và Customer.

## 15. Trả lời nhanh khi mentor hỏi

### “Tại sao PM tự cập nhật progress?”

> Vì Site Staff đã được bỏ khỏi scope hiện tại. PM đang là người quản lý task và cập nhật Daily Progress. Nếu mở rộng về sau, hệ thống có thể bổ sung site engineer/staff làm reporter nhưng không thay đổi ownership của project.

### “Đơn vị vật tư nằm ở đâu?”

> Unit được lưu trong Material Catalog và được hiển thị lại tại task requirement, Material Request, MRP, PO detail và inventory. Total của PO là tiền tệ; unit áp dụng cho quantity của từng line item.

### “Material Request có trừ ngân sách không?”

> Không. Material Request thể hiện nhu cầu và xử lý tồn kho. Ngân sách chỉ bắt đầu được giữ khi tạo PO vì lúc đó mới phát sinh cam kết mua hàng.

### “Khi nào ngân sách thay đổi?”

> Total budget chỉ thay đổi khi Admin thực hiện Adjust Budget. Trạng thái PO chỉ thay đổi cách phân loại số tiền thành Pending, Committed hoặc Actual, không tự thay đổi hạn mức total budget.

### “MRP đã chính xác hoàn toàn chưa?”

> Chưa. UI đã hiển thị đầy đủ dữ liệu backend cung cấp, nhưng hiện vẫn gọi là Estimated MRP vì reserved và on-order chưa được phân bổ chính xác theo project/warehouse, đồng thời issued quantity chưa được trừ hoàn chỉnh.

### “Supplier đang làm gì trong hệ thống?”

> Hiện Supplier tồn tại dưới dạng dữ liệu nhà cung cấp và catalog để Warehouse Manager chọn khi tạo PO. Supplier portal và supplier-scoped workflow chưa hoàn thành nên nhóm không coi đây là flow đã triển khai.

### “Frontend đã bảo vệ role chưa?”

> Frontend đã ẩn và giới hạn action theo role để bảo đảm đúng trải nghiệm demo. Tuy nhiên security thực sự phải được backend kiểm tra lại bằng authorization và project ownership vì frontend có thể bị bypass bằng gọi API trực tiếp.

