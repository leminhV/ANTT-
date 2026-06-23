import os

replacements = {
    'frontend/src/pages/reports/StrategicManagement.tsx': [
        ("toast.success('Thêm khoản đầu tư thành công');", "toast.success(t('add_investment_success'));"),
        ("toast.success('Thêm công bố khoa học thành công');", "toast.success(t('add_publication_success'));")
    ],
    'frontend/src/pages/reports/Reports.tsx': [
        ("toast.success('Đã lên lịch bảo trì tự động thành công', { id: toastId });", "toast.success(t('auto_maintenance_success'), { id: toastId });")
    ],
    'frontend/src/pages/profile/Profile.tsx': [
        ("toast.success('Tải ảnh đại diện thành công');", "toast.success(t('upload_avatar_success'));"),
        ("toast.success('Cập nhật thông tin liên lạc thành công');", "toast.success(t('update_contact_success'));"),
        ("toast.error('Cập nhật thất bại. Vui lòng thử lại.');", "toast.error(t('update_contact_failed'));"),
        ("log.status.includes('Thành công')", "log.status.includes('Thành công') || log.status.includes('Success')") # This might be dynamic from DB
    ],
    'frontend/src/pages/dashboard/Users.tsx': [
        ("toast.success('Đã tắt MFA thành công cho người dùng này.');", "toast.success(t('disable_mfa_success'));"),
        ("toast.success(`Đã nhập thành công ${res.data?.count || 0} người dùng!`, { id: toastId });", "toast.success(`${t('import_users_success')} ${res.data?.count || 0} ${t('users')}`, { id: toastId });"),
        ("Chưa cập nhật", "{t('not_updated_italic')}")
    ],
    'frontend/src/pages/dashboard/DashboardInstructor.tsx': [
        ("toast.success('Đã duyệt đơn thành công');", "toast.success(t('approve_request_success'));")
    ],
    'frontend/src/pages/community/Community.tsx': [
        ("toast.success(`${t('post')} thành công`);", "toast.success(t('post_success'));")
    ],
    'frontend/src/pages/checkin/QRScannerView.tsx': [
        ("toast.success('Quét QR thành công!');", "toast.success(t('scan_qr_success'));"),
        ("Lỗi quét mã", "{t('scan_qr_error')}"),
        ("Xử lý thành công", "{t('process_success')}")
    ],
    'frontend/src/pages/chemicals/ResourceManagement.tsx': [
        ("toast.success('Tải ảnh lên thành công', { id: toastId });", "toast.success(t('upload_image_success'), { id: toastId });")
    ],
    'frontend/src/pages/chemicals/LimitManagement.tsx': [
        ("toast.success('Thêm định mức thành công');", "toast.success(t('add_limit_success'));"),
        ("toast.success('Cập nhật định mức thành công');", "toast.success(t('update_limit_success'));"),
        ("toast.error('Lỗi khi cập nhật định mức');", "toast.error(t('update_limit_error'));"),
        ("toast.success('Xóa định mức thành công');", "toast.success(t('delete_limit_success'));"),
        ("editingLimit ? 'Cập nhật' : 'Thêm mới'", "editingLimit ? t('update_btn') : t('add_new')")
    ],
    'frontend/src/pages/booking/MyBookings.tsx': [
        ("toast.success(res.data?.message || 'Thao tác thành công!');", "toast.success(res.data?.message || t('action_success'));")
    ],
    'frontend/src/pages/booking/BorrowToolsView.tsx': [
        ("toast.success('Đăng ký nhận thông báo thành công!');", "toast.success(t('subscribe_noti_success'));"),
        ("toast.success('Đã gửi yêu cầu mượn thành công!');", "toast.success(t('send_borrow_request_success'));")
    ],
    'frontend/src/pages/courses/Courses.tsx': [
        ("isEditing ? 'Cập nhật' : 'Tạo mới'", "isEditing ? t('update_btn') : t('create_new')")
    ]
}

for filepath, reps in replacements.items():
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        for old_text, new_text in reps:
            content = content.replace(old_text, new_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Not found {filepath}")
