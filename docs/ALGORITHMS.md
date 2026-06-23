# Báo cáo Thuật toán & Cơ chế Tối ưu hóa Hệ thống LabBook

Hệ thống quản lý phòng thí nghiệm **LabBook** được thiết kế để phục vụ tần suất sử dụng cao, yêu cầu tính chính xác tuyệt đối về mặt thời gian, tính toàn vẹn của dữ liệu nhật ký và khả năng chịu tải đồng thời (concurrency) tốt. Tài liệu này mô tả chi tiết các thuật toán cốt lõi, mô hình toán học và cơ chế tối ưu hóa hệ thống đã được triển khai thực tế.

---

## Mục lục
1. [Thuật toán Gợi ý Lịch trống (Sliding Window Slot Suggestion)](#1-thuật-toán-gợi-ý-lịch-trống-sliding-window-slot-suggestion)
2. [Cơ chế Kiểm soát Giao dịch Đồng thời (Concurrency Control)](#2-cơ-chế-kiểm-soát-giao-dịch-đồng-thời-concurrency-control)
3. [Chuỗi Nhật ký Bảo mật Liên kết Cryptographic (Hash-Chained Audit Trail)](#3-chuỗi-nhật-ký-bảo-mật-liên-kết-cryptographic-hash-chained-audit-trail)

---

## 1. Thuật toán Gợi ý Lịch trống (Interval Merging & Complement Scan)

### 1.1 Mô hình Không - Thời gian (Time-Space Model)
Khi người dùng đặt phòng Lab ($R$) kèm thiết bị ($E$) trong khoảng thời gian có độ dài $T_{duration}$ (phút) vào ngày $D$ nhưng gặp xung đột lịch, hệ thống sẽ tự động đề xuất tối đa **5 khung giờ trống phù hợp nhất** trong vòng 3 ngày liên tiếp $[D, D+1, D+2]$.

Thuật toán hoạt động dựa trên các mốc thời gian hoạt động tĩnh của phòng:
*   $H_{start}$: Giờ bắt đầu hoạt động của phòng Lab (ví dụ: `07:00`).
*   $H_{end}$: Giờ kết thúc hoạt động của phòng Lab (ví dụ: `22:00`).
*   $T_{buffer}$: Thời gian đệm bắt buộc giữa hai ca đặt lịch để vệ sinh (ví dụ: `15` phút).
*   $T_{step}$: Bước thời gian tịnh tiến để đa dạng hóa gợi ý (mặc định là `30` phút).

Thay vì quét tịnh tiến cửa sổ trượt và kiểm tra xung đột lặp lại trên toàn bộ lịch đặt, giải thuật này giải quyết bằng lý thuyết tập hợp:
1.  **Hợp nhất khoảng bận (Interval Merging):** Gom toàn bộ các lịch đặt bận đã mở rộng thời gian đệm $T_{buffer}$ thành một tập hợp các khoảng bận rời rạc không chồng lấn $B = \{I_1, I_2, \dots, I_m\}$.
2.  **Quét tìm khoảng bù (Complement Scan):** Tính toán phần bù (khoảng trống khả dụng) của tập bận $B$ trong giới hạn giờ làm việc của từng ngày:
    $$F = [startOfDay, endOfDay] \setminus B$$
3.  **Sinh gợi ý:** Chia nhỏ các khoảng trống trong tập $F$ thành các mốc đặt lịch có độ dài $T_{duration}$.

### 1.2 Luồng xử lý chi tiết & Các trường hợp biên (Edge Cases)
1.  **Lọc mốc thời gian quá khứ:** Nếu ngày đang xét là ngày hôm nay ($D = \text{today}$), mốc bắt đầu tìm kiếm $t_{start}$ phải lớn hơn hoặc bằng thời điểm hiện tại, được làm tròn lên mốc 30 phút gần nhất:
    $$\text{Minutes}(t_{start}) \in \{0, 30\}$$
2.  **Khử trùng lặp trên phòng và thiết bị:** Thuật toán truy vấn các lịch đặt bận có trạng thái hoạt động (`PENDING`, `APPROVED`, `IN_USE`) của cả phòng $R$ và thiết bị $E$.
3.  **Sắp xếp & Hợp nhất:** Danh sách khoảng bận được sắp xếp tăng dần theo thời gian bắt đầu. Duyệt qua danh sách để hợp nhất khoảng $i$ và $i+1$ nếu $start_{i+1} \le end_i$.
4.  **Chặn biên giờ làm việc (Tránh vắt qua đêm):** Đây là một edge case cực kỳ quan trọng. Nhằm tránh đề xuất các khung giờ quá nửa đêm hoặc sáng sớm (ví dụ: từ 22:00 đến 07:00 ngày hôm sau), thuật toán xử lý từng ngày độc lập. Tập khoảng trống khả dụng $F$ được tính toán nghiêm ngặt bên trong ranh giới $[startOfDay, endOfDay]$ của ngày đang xét. Bất kỳ khoảng bù nào nằm ngoài hoặc vắt qua ranh giới này đều bị loại bỏ hoặc "cắt đứt" tự động ở mốc nửa đêm (kết thúc ca làm việc lúc 22:00).
5.  **Tịnh tiến sinh mốc gợi ý:** Trong mỗi khoảng trống khả dụng $[free_{start}, free_{end}]$, tiến hành sinh các mốc gợi ý dài $T_{duration}$, mỗi mốc cách nhau một bước $T_{step} = 30$ phút để sinh ra đa dạng lựa chọn cho sinh viên, cho đến khi gom đủ 5 gợi ý.

### 1.3 Mã giả thuật toán (Pseudocode)

```typescript
function suggestSlots(roomId, dateStr, durationMinutes, equipmentId): List<Slot> {
    const baseDate = parseDate(dateStr);
    const startHourLimit = getSetting("BOOKING_START_HOUR", 7);
    const endHourLimit = getSetting("BOOKING_END_HOUR", 22);
    const bufferMinutes = getSetting("BOOKING_BUFFER_MINUTES", 15);
    const stepMinutes = 30;
    
    const suggestions = [];
    
    // Quét tối đa 3 ngày tiếp theo
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        if (suggestions.length >= 5) break;
        
        const currentDate = baseDate.addDays(dayOffset);
        let startOfDay = currentDate.setHours(startHourLimit, 0, 0);
        const endOfDay = currentDate.setHours(endHourLimit, 0, 0);
        
        // Edge Case: Ngày hiện tại trùng với ngày hôm nay
        const now = getCurrentTime();
        if (currentDate.isToday() && startOfDay < now) {
            startOfDay = roundUpToNearest30Minutes(now);
        }
        
        // 1. Lấy danh sách booking bận
        const bookings = DB.queryBookings({
            roomId: roomId,
            equipmentId: equipmentId,
            statusIn: ['PENDING', 'APPROVED', 'IN_USE'],
            startTimeLessThan: endOfDay,
            endTimeGreaterThan: startOfDay
        });
        
        const busyIntervals = bookings.map(b => ({
            start: b.startTime - bufferMinutes,
            end: b.endTime + bufferMinutes
        }));
        
        // 2. Hợp nhất khoảng bận (Interval Merging)
        const merged = [];
        if (busyIntervals.length > 0) {
            busyIntervals.sort((a, b) => a.start - b.start);
            let current = busyIntervals[0];
            
            for (let i = 1; i < busyIntervals.length; i++) {
                let next = busyIntervals[i];
                if (next.start <= current.end) {
                    current.end = max(current.end, next.end);
                } else {
                    merged.push(current);
                    current = next;
                }
            }
            merged.push(current);
        }
        
        // 3. Quét tìm khoảng trống bù (Complement Scan) giới hạn trong [startOfDay, endOfDay]
        const freeIntervals = [];
        if (merged.length === 0) {
            freeIntervals.push({ start: startOfDay, end: endOfDay });
        } else {
            if (merged[0].start > startOfDay) {
                freeIntervals.push({ start: startOfDay, end: merged[0].start });
            }
            for (let i = 0; i < merged.length - 1; i++) {
                if (merged[i].end < merged[i+1].start) {
                    freeIntervals.push({ start: merged[i].end, end: merged[i+1].start });
                }
            }
            if (merged[merged.length - 1].end < endOfDay) {
                freeIntervals.push({ start: merged[merged.length - 1].end, end: endOfDay });
            }
        }
        
        // 4. Sinh mốc gợi ý từ khoảng trống
        for (let free of freeIntervals) {
            if (suggestions.length >= 5) break;
            
            let currentStart = free.start;
            while (currentStart + durationMinutes <= free.end) {
                if (suggestions.length >= 5) break;
                
                suggestions.push({
                    start_time: currentStart,
                    end_time: currentStart + durationMinutes
                });
                
                // Dịch chuyển bước 30 phút để sinh thêm mốc
                currentStart = currentStart + stepMinutes;
            }
        }
    }
    
    return suggestions.slice(0, 5);
}
```

### 1.4 Đánh giá độ phức tạp thuật toán (Complexity Analysis)
*   **Độ phức tạp thời gian (Time Complexity):**
    *   Gọi $B$ là số lượng lịch đặt hoạt động trong ngày ($B \le 15$). Việc sắp xếp danh sách khoảng bận mất $O(B \log B)$.
    *   Vòng lặp hợp nhất mất thời gian tuyến tính $O(B)$.
    *   Vòng lặp tính khoảng bù complement mất $O(B)$.
    *   Sinh gợi ý mất tối đa $O(N_{suggestions} \cdot \frac{T_{free}}{T_{step}}) = O(1)$ vì số lượng gợi ý bị giới hạn cứng $\le 5$.
    *   Tổng độ phức tạp thời gian cho $D = 3$ ngày là:
        $$O(D \cdot B \log B)$$
        So với thuật toán cũ $O(D \cdot N_{steps} \cdot B)$, giải thuật mới chạy cực kỳ nhanh và cực kỳ ổn định, không phụ thuộc vào số bước chia nhỏ trong ngày ($N_{steps}$), tránh được hiện tượng suy giảm hiệu năng khi cấu hình bước quét rất nhỏ (ví dụ bước quét 5-10 phút).
*   **Độ phức tạp không gian (Space Complexity):**
    *   Lưu trữ các mảng bận, mảng hợp nhất và mảng khoảng trống bù có kích thước tối đa là $O(B)$.
    *   Tổng độ phức tạp không gian là $O(B)$.

---

## 2. Cơ chế Kiểm soát Giao dịch Đồng thời (Concurrency Control)

Hệ thống kết hợp cả hai cơ chế Khóa bi quan và Khóa lạc quan để giải quyết triệt để vấn đề xung đột tài nguyên dùng chung.

```
       [Yêu cầu Đặt lịch phòng R]                     [Yêu cầu Check-in/Check-out]
                  │                                                 │
                  ▼                                                 ▼
      ┌───────────────────────┐                         ┌───────────────────────┐
      │  PESSIMISTIC LOCKING  │                         │  OPTIMISTIC LOCKING   │
      │  tx.$executeRaw       │                         │  Kiểm tra row_version │
      │  SELECT...FOR UPDATE  │                         └───────────┬───────────┘
      └───────────┬───────────┘                                     │
                  │ (Khóa dòng R trong DB)                          │ (Cập nhật phiên bản)
                  ▼                                                 ▼
      ┌───────────────────────┐                         ┌───────────────────────┐
      │  Kiểm tra trùng lịch  │                         │ So khớp row_version   │
      │  & Thời gian đệm      │                         │ trong câu lệnh UPDATE │
      └───────────┬───────────┘                         └───────────┬───────────┘
                  │                                                 │
        ┌─────────┴─────────┐                             ┌─────────┴─────────┐
        ▼                   ▼                             ▼                   ▼
    [Thành công]        [Hủy bỏ]                      [Khớp]             [Không khớp]
  (Commit & Unlock)  (Rollback tx)               (Tăng row_version)    (Throw Conflict)
```

### 2.1 Khóa bi quan (Pessimistic Locking - `SELECT FOR UPDATE`)
*   **Mục đích:** Khi có hai hoặc nhiều sinh viên cùng gửi yêu cầu đặt cùng một phòng Lab $R$ hoặc thiết bị $E$ tại cùng một thời điểm cho cùng một khung giờ, nếu không kiểm soát, cả hai đơn đều có thể vượt qua bước kiểm tra trùng lịch (Race Condition) và được ghi vào CSDL.
*   **Triển khai thực tế:**
    *   Toàn bộ luồng tạo hoặc cập nhật lịch đặt được bao bọc trong một Prisma Transaction cô lập cao độ.
    *   Trước khi thực hiện bất kỳ truy vấn hay kiểm tra trùng lịch nào, hệ thống thực thi câu lệnh SQL thô nhằm xác lập khóa độc quyền (Exclusive Lock) trên dòng bản ghi phòng và thiết bị:
        ```sql
        SELECT id FROM rooms WHERE id = ? FOR UPDATE;
        SELECT id FROM equipment WHERE id = ? FOR UPDATE;
        ```
    *   **Nguyên lý hoạt động:** Câu lệnh này buộc mọi transaction đồng thời khác đang muốn thao tác trên phòng hoặc thiết bị đó phải rơi vào trạng thái chờ (Block) cho đến khi transaction hiện tại Commit hoặc Rollback thành công. Từ đó, loại bỏ hoàn toàn khả năng xung đột lịch đặt.

### 2.2 Khóa lạc quan (Optimistic Locking - `row_version`)
*   **Mục đích:** Dành cho các tác vụ cập nhật trạng thái có tần suất đọc nhiều, ít xung đột trực tiếp trên cùng một mili-giây (ví dụ: tác vụ Check-in/Check-out của sinh viên, cập nhật thông tin thiết bị của Admin). Nó giúp tránh lỗi **Lost Update** (người cập nhật sau ghi đè lên dữ liệu của người cập nhật trước mà không biết trạng thái đã thay đổi).
*   **Triển khai thực tế:**
    *   Bảng `Booking` và `Equipment` được thiết kế có thêm cột `row_version` (kiểu số nguyên, mặc định khởi tạo là `1`).
    *   Khi client thực hiện thao tác cập nhật (ví dụ: sửa thông tin lịch đặt), client bắt buộc phải gửi kèm giá trị `row_version` hiện tại mà họ đọc được từ màn hình.
    *   Hệ thống thực hiện câu lệnh cập nhật kết hợp kiểm tra phiên bản:
        ```typescript
        this.prisma.booking.update({
          where: {
            id: bookingId,
            row_version: clientRowVersion // Chỉ cập nhật nếu phiên bản trong DB khớp với client gửi lên
          },
          data: {
            ...updateData,
            row_version: { increment: 1 } // Tự động tăng phiên bản lên 1 đơn vị
          }
        })
        ```
    *   Nếu một tiến trình khác đã cập nhật bản ghi này trước đó, `row_version` trong DB đã tăng lên. Prisma sẽ không tìm thấy dòng nào khớp với điều kiện `where` và ném ra lỗi `P2025` (Record not found), hệ thống lập tức chuyển đổi thành lỗi `ConflictException` để cảnh báo người dùng tải lại dữ liệu mới nhất.

---

## 3. Chuỗi Nhật ký Bảo mật Liên kết Cryptographic (Hash-Chained Audit Trail)

Nhằm đáp ứng tiêu chuẩn an toàn thông tin cao cấp và đảm bảo tính chống chối bỏ, hệ thống LabBook triển khai cơ chế **Hash Chaining** để ghi nhận nhật ký hệ thống (Audit Log). Cơ chế này hoạt động tương tự cấu trúc liên kết khối (Blockchain).

### 3.1 Mô hình Toán học của chuỗi liên kết
Mỗi hành động thay đổi dữ liệu (tạo mới, cập nhật, xóa) đều sinh ra một bản ghi nhật ký $L_i$. Bản ghi này được liên kết chặt chẽ với bản ghi liền trước $L_{i-1}$ thông qua mã băm mật mã học SHA-256.

Công thức tính mã băm của bản ghi hiện tại $H_i$ được định nghĩa như sau:
$$H_0 = \text{GENESIS\_HASH} = \text{"GENESIS\_HASH"}$$
$$H_i = \text{SHA256}\Big( H_{i-1} \parallel \text{Action}_i \parallel \text{Table}_i \parallel \text{RecordId}_i \parallel \text{UserId}_i \parallel \text{Details}_i \parallel \text{Timestamp}_i \Big)$$

Trong đó:
*   $\parallel$ là phép nối chuỗi (String Concatenation), ngăn cách bởi ký tự đặc biệt `|`.
*   $H_{i-1}$: Mã băm của bản ghi nhật ký ngay trước đó (`previous_hash`).
*   $\text{Action}_i$: Phương thức HTTP + URL hành động (ví dụ: `POST /api/bookings`).
*   $\text{Table}_i$: Tên bảng/Thành phần bị tác động.
*   $\text{RecordId}_i$: ID của thực thể bị thay đổi.
*   $\text{UserId}_i$: ID của người thực hiện hành động (hoặc `SYSTEM` nếu tự động).
*   $\text{Details}_i$: Chuỗi JSON chứa toàn bộ dữ liệu payload được gửi lên.
*   $\text{Timestamp}_i$: Thời gian ghi nhận chuẩn ISO 8601.

### 3.2 Quy trình thực thi tại Interceptor
Hệ thống sử dụng NestJS `AuditLogInterceptor` để tự động hóa quy trình ghi nhật ký mà không làm ảnh hưởng đến mã nguồn nghiệp vụ chính:

```
                  [Yêu cầu POST/PATCH/DELETE]
                              │
                              ▼
                      [Xử lý nghiệp vụ]
                              │
               (Thành công) ──┴── (Lấy dữ liệu phản hồi)
                              │
                              ▼
                 [Bắt đầu Transaction ghi Log]
                              │
                              ▼
             1. SELECT bản ghi Log cuối cùng (L_i-1)
                              │
                              ▼
             2. Lấy H_i-1 (Nếu không có, dùng GENESIS_HASH)
                              │
                              ▼
             3. Tạo Payload: H_i-1|Action|Table|...|Timestamp
                              │
                              ▼
             4. Tính H_i = SHA256(Payload)
                              │
                              ▼
             5. INSERT bản ghi L_i vào bảng AuditLog
                              │
                              ▼
                   [Commit Transaction]
```

### 3.3 Thuật toán Kiểm tra Tính Toàn vẹn (Integrity Verification)
Để phát hiện bất kỳ sự thay đổi trái phép nào trong CSDL (ví dụ: hacker xâm nhập trực tiếp DB và sửa hoặc xóa nhật ký), Admin có thể kích hoạt tiến trình đối soát toàn vẹn chuỗi.

**Thuật toán đối soát:**
1.  Truy vấn toàn bộ danh sách `AuditLog` sắp xếp tăng dần theo `id`.
2.  Khởi tạo biến kiểm tra: $expectedHash = \text{"GENESIS\_HASH"}$.
3.  Với mỗi bản ghi $L_i$ từ đầu đến cuối chuỗi:
    *   Nếu $L_i.previous\_hash \ne expectedHash$: Kết luận hệ thống bị đứt gãy liên kết hoặc có bản ghi bị xóa tại vị trí trước $L_i$.
    *   Tính toán mã băm thực tế:
        $$calculatedHash = \text{SHA256}(L_i.previous\_hash \parallel L_i.action \parallel \dots \parallel L_i.timestamp)$$
    *   Nếu $L_i.current\_hash \ne calculatedHash$: Kết luận nội dung bản ghi $L_i$ đã bị sửa đổi trái phép (Tampered).
    *   Cập nhật mốc so sánh tiếp theo: $expectedHash = L_i.current\_hash$.
4.  Nếu duyệt hết chuỗi và không phát hiện bất thường: Chuỗi nhật ký hoàn toàn an toàn và toàn vẹn.

Độ phức tạp của thuật toán kiểm tra toàn vẹn là tuyến tính $O(N)$ với $N$ là tổng số bản ghi nhật ký, đảm bảo có thể chạy quét định kỳ một cách hiệu quả.
