import json
import os

files = {
    'vi': 'frontend/src/locales/vi/translation.json',
    'en': 'frontend/src/locales/en/translation.json',
    'ja': 'frontend/src/locales/ja/translation.json'
}

new_keys = {
    'vi': {
        "add_investment_success": "Thêm khoản đầu tư thành công",
        "add_publication_success": "Thêm công bố khoa học thành công",
        "auto_maintenance_success": "Đã lên lịch bảo trì tự động thành công",
        "upload_avatar_success": "Tải ảnh đại diện thành công",
        "update_contact_success": "Cập nhật thông tin liên lạc thành công",
        "update_contact_failed": "Cập nhật thất bại. Vui lòng thử lại.",
        "not_updated_italic": "Chưa cập nhật",
        "status_success": "Thành công",
        "status_failed": "Thất bại",
        "disable_mfa_success": "Đã tắt MFA thành công cho người dùng này.",
        "import_users_success": "Đã nhập thành công",
        "users": "người dùng!",
        "approve_request_success": "Đã duyệt đơn thành công",
        "post_success": "thành công",
        "scan_qr_success": "Quét QR thành công!",
        "scan_qr_error": "Lỗi quét mã",
        "process_success": "Xử lý thành công",
        "upload_image_success": "Tải ảnh lên thành công",
        "add_limit_success": "Thêm định mức thành công",
        "update_limit_success": "Cập nhật định mức thành công",
        "update_limit_error": "Lỗi khi cập nhật định mức",
        "delete_limit_success": "Xóa định mức thành công",
        "action_success": "Thao tác thành công!",
        "subscribe_noti_success": "Đăng ký nhận thông báo thành công!",
        "send_borrow_request_success": "Đã gửi yêu cầu mượn thành công!",
        "add_new": "Thêm mới",
        "update_btn": "Cập nhật",
        "create_new": "Tạo mới"
    },
    'en': {
        "add_investment_success": "Investment added successfully",
        "add_publication_success": "Publication added successfully",
        "auto_maintenance_success": "Auto maintenance scheduled successfully",
        "upload_avatar_success": "Avatar uploaded successfully",
        "update_contact_success": "Contact info updated successfully",
        "update_contact_failed": "Update failed. Please try again.",
        "not_updated_italic": "Not updated",
        "status_success": "Success",
        "status_failed": "Failed",
        "disable_mfa_success": "MFA disabled successfully for this user.",
        "import_users_success": "Successfully imported",
        "users": "users!",
        "approve_request_success": "Request approved successfully",
        "post_success": "successfully",
        "scan_qr_success": "QR scanned successfully!",
        "scan_qr_error": "Scan error",
        "process_success": "Processed successfully",
        "upload_image_success": "Image uploaded successfully",
        "add_limit_success": "Limit added successfully",
        "update_limit_success": "Limit updated successfully",
        "update_limit_error": "Error updating limit",
        "delete_limit_success": "Limit deleted successfully",
        "action_success": "Action successful!",
        "subscribe_noti_success": "Successfully subscribed to notifications!",
        "send_borrow_request_success": "Borrow request sent successfully!",
        "add_new": "Add new",
        "update_btn": "Update",
        "create_new": "Create new"
    },
    'ja': {
        "add_investment_success": "投資が正常に追加されました",
        "add_publication_success": "出版物が正常に追加されました",
        "auto_maintenance_success": "自動メンテナンスが正常にスケジュールされました",
        "upload_avatar_success": "アバターが正常にアップロードされました",
        "update_contact_success": "連絡先情報が正常に更新されました",
        "update_contact_failed": "更新に失敗しました。もう一度お試しください。",
        "not_updated_italic": "未更新",
        "status_success": "成功",
        "status_failed": "失敗",
        "disable_mfa_success": "このユーザーのMFAが正常に無効化されました。",
        "import_users_success": "正常にインポートされました",
        "users": "ユーザー！",
        "approve_request_success": "リクエストが正常に承認されました",
        "post_success": "正常に投稿されました",
        "scan_qr_success": "QRコードが正常にスキャンされました！",
        "scan_qr_error": "スキャンエラー",
        "process_success": "正常に処理されました",
        "upload_image_success": "画像が正常にアップロードされました",
        "add_limit_success": "制限が正常に追加されました",
        "update_limit_success": "制限が正常に更新されました",
        "update_limit_error": "制限の更新中にエラーが発生しました",
        "delete_limit_success": "制限が正常に削除されました",
        "action_success": "アクション成功！",
        "subscribe_noti_success": "通知の購読に成功しました！",
        "send_borrow_request_success": "借用リクエストが正常に送信されました！",
        "add_new": "新しく追加する",
        "update_btn": "更新",
        "create_new": "新規作成"
    }
}

for lang, path in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for k, v in new_keys[lang].items():
        data[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Finished updating JSON files.")
