import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { checkInService, equipmentService } from '../../services';
import { toast } from 'react-hot-toast';
import { QrCode, RefreshCw } from 'lucide-react';
import { DeviceDetailModal } from '../../components/equipment/DeviceDetailModal';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

export function QRScannerView() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { qrbox: { width: 250, height: 250 }, fps: 5 },
      false
    );

    scanner.render(
      (result) => {
        scanner.clear();
        handleScan(result);
      },
      (_error) => {
        // Ignored, happens constantly when scanning
      }
    );

    return () => {
      scanner.clear();
    };
  }, []);

  const handleScan = async (data: string) => {
    try {
      // Data expected to be JSON string: {"id":1, "type":"equipment"}
      let payload: any = {};
      try {
        payload = JSON.parse(data);
      } catch (e) {
        // Not a JSON payload
      }

      // 1. Get equipment info and show popup if it's an equipment QR
      if (payload.type === 'equipment' && payload.id) {
        try {
          const eqRes = await equipmentService.getOne(payload.id);
          setSelectedDevice(eqRes.data);
          setIsDetailModalOpen(true);
        } catch (err) {
          toast.error('Không tìm thấy thông tin thiết bị này trong hệ thống.');
        }
      }

      // 2. Call scanQR to log check-in/out event
      const res = await checkInService.scanQR(data);
      setScanResult(res.data);
      toast.success(t('scan_qr_success'));
    } catch (err: any) {
      toast.error('Lỗi khi quét QR: ' + (err.response?.data?.message || 'Dữ liệu mã QR không hợp lệ'));
      setScanResult({ error: 'Không thể xử lý mã QR này' });
    }
  };

  const resetScan = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-[600px] w-full mx-auto animate-in fade-in duration-300 flex flex-col space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
          <QrCode className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Quét Mã QR</h1>
          <p className="text-sm text-neutral-500 dark:text-slate-400">Check-in / Check-out thiết bị phòng Lab</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-neutral-200 dark:border-slate-800">
        {!scanResult ? (
          <div className="space-y-4">
            <div id="reader" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 dark:border-slate-700"></div>
            <p className="text-center text-sm text-neutral-500 dark:text-slate-400">
              Đưa mã QR của thiết bị vào khung ngắm để quét.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {scanResult.error ? (
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">✖</span>
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center">
                <span className="text-3xl">✔</span>
              </div>
            )}
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                {scanResult.error ? t('scan_qr_error') : t('process_success')}
              </h2>
              {scanResult.error ? (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                  {scanResult.error}
                </p>
              ) : (
                <div className="mt-4 p-5 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-blue-900/20 rounded-xl border border-slate-200 dark:border-slate-700 w-full text-left shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Trạng thái</span>
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full">
                        {scanResult.status === 'IN_USE' ? 'ĐÃ CHECK-IN' : 'ĐÃ CHECK-OUT'}
                      </span>
                    </div>
                    {scanResult.record && (
                      <div className="space-y-1.5 mt-2">
                        {scanResult.record.room_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">ID Phòng:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">ROOM_{scanResult.record.room_id}</span>
                          </div>
                        )}
                        {scanResult.record.equipment_id && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">ID Thiết bị:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">EQ_{scanResult.record.equipment_id}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-2">
                          <span className="text-slate-500 dark:text-slate-400">Thời gian:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {new Date().toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetScan}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tiếp tục quét
            </button>
          </div>
        )}
      </div>

      <DeviceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDevice={selectedDevice}
        currentUser={user}
      />
    </div>
  );
}
