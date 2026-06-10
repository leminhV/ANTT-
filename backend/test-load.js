const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const CONCURRENCY = 500;
const ROOM_ID = 1; // Giả sử phòng Lab IoT có ID là 1
const USER_ID = 2; // Giả sử sinh viên test có ID là 2
const START_TIME = "2026-06-10T08:00:00Z";
const END_TIME = "2026-06-10T10:00:00Z";

// Bạn cần truyền vào 1 Access Token thực tế lấy từ Chrome F12
const TOKEN = "YOUR_ACCESS_TOKEN_HERE";

async function makeBookingRequest(reqId) {
  try {
    const response = await axios.post(
      `${BASE_URL}/bookings`,
      {
        room_id: ROOM_ID,
        start_time: START_TIME,
        end_time: END_TIME,
        purpose: `Stress Test Request #${reqId}`
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );
    return { reqId, status: response.status, success: true };
  } catch (error) {
    return { reqId, status: error.response?.status || 500, success: false, message: error.response?.data?.message || error.message };
  }
}

async function runLoadTest() {
  console.log(`🚀 Bắt đầu Load Test: Bắn ${CONCURRENCY} request cùng lúc vào hệ thống...`);
  const startTime = Date.now();

  const promises = [];
  for (let i = 1; i <= CONCURRENCY; i++) {
    promises.push(makeBookingRequest(i));
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();

  const successCount = results.filter(r => r.success).length;
  const conflictCount = results.filter(r => r.status === 409).length;
  const otherFailures = results.filter(r => !r.success && r.status !== 409).length;

  console.log('====================================');
  console.log('📊 KẾT QUẢ LOAD TEST (PESSIMISTIC LOCKING)');
  console.log('====================================');
  console.log(`⏱️ Thời gian thực thi: ${endTime - startTime}ms`);
  console.log(`✅ Thành công (Lấy được phòng): ${successCount}`);
  console.log(`❌ Bị từ chối do đụng lịch (Lỗi 409): ${conflictCount}`);
  console.log(`⚠️ Lỗi khác: ${otherFailures}`);
  
  if (successCount === 1 && conflictCount === CONCURRENCY - 1) {
    console.log('🎉 KẾT LUẬN: THÀNH CÔNG! Chức năng Khóa bi quan hoạt động 100% chuẩn xác. Không có Double Booking!');
  } else {
    console.log('🚨 KẾT LUẬN: CÓ LỖI! Dữ liệu không nhất quán.');
  }
}

runLoadTest();
