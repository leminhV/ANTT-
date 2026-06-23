import json
import os
import re

# 1. Update translation.json
files = {
    'vi': 'frontend/src/locales/vi/translation.json',
    'en': 'frontend/src/locales/en/translation.json',
    'ja': 'frontend/src/locales/ja/translation.json'
}

new_keys = {
    'vi': {
        "search_filter": "Bộ lọc tìm kiếm:",
        "lab_room": "Phòng Lab",
        "subject": "Học phần",
        "book_schedule": "Đặt lịch",
        "today": "Hôm nay",
        "equipment": "Thiết bị",
        "consumable_chemicals": "Hóa chất tiêu hao",
        "practice_combo": "Combo Thực hành",
        "all_labs": "Tất cả phòng Lab",
        "add_to_cart": "Thêm vào giỏ",
        "cart": "Giỏ mượn",
        "notify_when_available": "Nhận thông báo khi trống",
        "maintenance": "Bảo trì",
        "post": "Đăng bài",
        "no_posts_yet": "Chưa có bài viết nào. Hãy là người đầu tiên!",
        "share_experience": "Chia sẻ kinh nghiệm, hỏi đáp và tìm bạn cùng nhóm thực hành.",
        "two_factor_auth": "Bảo mật 2 lớp (MFA)",
        "protect_account": "Bảo vệ tài khoản của bạn khỏi các cuộc tấn công bằng cách yêu cầu mã xác thực 6 số từ điện thoại mỗi khi đăng nhập.",
        "setup_2fa": "Thiết lập bảo mật 2 lớp",
        "lead_time": "Khung thời gian đặt trước (Lead Time)",
        "max_advance_booking": "Cho phép đặt trước tối đa (Ngày)",
        "min_advance_booking": "Phải đặt trước tối thiểu (Giờ)",
        "prevent_far_booking": "Ngăn sinh viên đặt phòng quá xa trong tương lai",
        "prep_time": "Thời gian chuẩn bị trước khi sử dụng phòng",
        "max_bookings_per_day_desc": "Số đơn đặt tối đa của một sinh viên trong ngày",
        "open_time_desc": "Giờ bắt đầu mở cửa",
        "close_time_desc": "Giờ đóng cửa",
        "min_time_desc": "Thời gian tối thiểu mỗi ca (phút)",
        "max_time_desc": "Thời gian tối đa mỗi ca (phút)",
        "buffer_time_desc": "Thời gian đệm giữa 2 ca (phút)"
    },
    'en': {
        "search_filter": "Search filter:",
        "lab_room": "Lab Room",
        "subject": "Subject",
        "book_schedule": "Book Schedule",
        "today": "Today",
        "equipment": "Equipment",
        "consumable_chemicals": "Consumables",
        "practice_combo": "Practice Combo",
        "all_labs": "All Labs",
        "add_to_cart": "Add to cart",
        "cart": "Cart",
        "notify_when_available": "Notify when available",
        "maintenance": "Maintenance",
        "post": "Post",
        "no_posts_yet": "No posts yet. Be the first to share!",
        "share_experience": "Share your experience, ask questions and find lab partners.",
        "two_factor_auth": "Two-Factor Authentication (MFA)",
        "protect_account": "Protect your account from attacks by requiring a 6-digit code from your phone every time you log in.",
        "setup_2fa": "Set up 2FA",
        "lead_time": "Booking Lead Time",
        "max_advance_booking": "Max advance booking (Days)",
        "min_advance_booking": "Min advance booking (Hours)",
        "prevent_far_booking": "Prevent students from booking too far in advance",
        "prep_time": "Preparation time required before using the room",
        "max_bookings_per_day_desc": "Maximum number of bookings per student per day",
        "open_time_desc": "Opening time",
        "close_time_desc": "Closing time",
        "min_time_desc": "Minimum duration per session (mins)",
        "max_time_desc": "Maximum duration per session (mins)",
        "buffer_time_desc": "Buffer time between 2 sessions (mins)"
    },
    'ja': {
        "search_filter": "検索フィルター:",
        "lab_room": "ラボ室",
        "subject": "科目",
        "book_schedule": "予約する",
        "today": "今日",
        "equipment": "機器",
        "consumable_chemicals": "消耗品",
        "practice_combo": "実践コンボ",
        "all_labs": "すべてのラボ",
        "add_to_cart": "カートに追加",
        "cart": "カート",
        "notify_when_available": "空き状況を通知",
        "maintenance": "メンテナンス",
        "post": "投稿する",
        "no_posts_yet": "まだ投稿がありません。最初の投稿者になりましょう！",
        "share_experience": "経験を共有し、質問し、ラボのパートナーを見つけましょう。",
        "two_factor_auth": "2要素認証（MFA）",
        "protect_account": "ログインするたびに電話からの6桁のコードを要求することで、アカウントを攻撃から保護します。",
        "setup_2fa": "2FAを設定する",
        "lead_time": "予約リードタイム",
        "max_advance_booking": "最大事前予約（日）",
        "min_advance_booking": "最小事前予約（時間）",
        "prevent_far_booking": "学生が遠すぎる未来の予約を防ぐ",
        "prep_time": "部屋を使用する前の準備時間",
        "max_bookings_per_day_desc": "学生1人あたりの1日の最大予約数",
        "open_time_desc": "開始時間",
        "close_time_desc": "終了時間",
        "min_time_desc": "各セッションの最小時間（分）",
        "max_time_desc": "各セッションの最大時間（分）",
        "buffer_time_desc": "2つのセッション間のバッファ時間（分）"
    }
}

for lang, path in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for k, v in new_keys[lang].items():
        data[k] = v
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 2. Replacements in TSX files
replacements = {
    'frontend/src/pages/booking/CalendarView.tsx': [
        ('Bộ lọc tìm kiếm:', '{t(\'search_filter\')}'),
        ('Đặt lịch', '{t(\'book_schedule\')}'),
        ('Hôm nay', '{t(\'today\')}')
    ],
    'frontend/src/pages/booking/BorrowToolsView.tsx': [
        ('Thiết bị', '{t(\'equipment\')}'),
        ('Hóa chất tiêu hao', '{t(\'consumable_chemicals\')}'),
        ('Combo Thực hành', '{t(\'practice_combo\')}'),
        ('Mọi phòng Lab', '{t(\'all_labs\')}'),
        ('Thêm vào giỏ', '{t(\'add_to_cart\')}'),
        ('Giỏ mượn', '{t(\'cart\')}'),
        ('Nhận thông báo khi trống', '{t(\'notify_when_available\')}'),
        ('Bảo trì', '{t(\'maintenance\')}')
    ],
    'frontend/src/pages/community/Community.tsx': [
        ('Đăng bài', '{t(\'post\')}'),
        ('Chưa có bài viết nào. Hãy là người đầu tiên!', '{t(\'no_posts_yet\')}'),
        ('Chia sẻ kinh nghiệm, hỏi đáp và tìm bạn cùng nhóm thực hành.', '{t(\'share_experience\')}')
    ],
    'frontend/src/pages/profile/Profile.tsx': [
        ('Bảo mật 2 lớp (MFA)', '{t(\'two_factor_auth\')}'),
        ('Bảo vệ tài khoản của bạn khỏi các cuộc tấn công bằng cách yêu cầu mã xác thực 6 số từ điện thoại mỗi khi đăng nhập.', '{t(\'protect_account\')}'),
        ('Thiết lập bảo mật 2 lớp', '{t(\'setup_2fa\')}')
    ],
    'frontend/src/pages/settings/Settings.tsx': [
        ('Khung thời gian đặt trước (Lead Time)', '{t(\'lead_time\')}'),
        ('Cho phép đặt trước tối đa (Ngày)', '{t(\'max_advance_booking\')}'),
        ('Phải đặt trước tối thiểu (Giờ)', '{t(\'min_advance_booking\')}'),
        ('Ngăn sinh viên đặt phòng quá xa trong tương lai', '{t(\'prevent_far_booking\')}'),
        ('Thời gian chuẩn bị trước khi sử dụng phòng', '{t(\'prep_time\')}'),
        ('Số đơn đặt tối đa của một sinh viên trong ngày', '{t(\'max_bookings_per_day_desc\')}'),
        ('Giờ bắt đầu mở cửa', '{t(\'open_time_desc\')}'),
        ('Giờ đóng cửa', '{t(\'close_time_desc\')}'),
        ('Thời gian tối thiểu mỗi ca (phút)', '{t(\'min_time_desc\')}'),
        ('Thời gian tối đa mỗi ca (phút)', '{t(\'max_time_desc\')}'),
        ('Thời gian đệm giữa 2 ca (phút)', '{t(\'buffer_time_desc\')}')
    ]
}

for filepath, reps in replacements.items():
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        for old_text, new_text in reps:
            content = content.replace(old_text, new_text)
            # Also handle cases where they are inside strings or tags
            content = content.replace(f'"{old_text}"', new_text)
            content = content.replace(f"'{old_text}'", new_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
