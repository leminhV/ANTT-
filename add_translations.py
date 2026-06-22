import json
import os

files = {
    'vi': 'frontend/src/locales/vi/translation.json',
    'en': 'frontend/src/locales/en/translation.json',
    'ja': 'frontend/src/locales/ja/translation.json'
}

new_keys = {
    'vi': {
        "borrow_tools": "Mượn dụng cụ học tập",
        "lab_community": "Cộng đồng Lab",
        "strategic": "Chiến lược",
        "strategic_management": "Quản lý Chiến lược",
        "scan_qr": "Quét QR Check-in",
        "scan_qr_checkin": "Quét Mã QR Check-in",
        "combos_management": "Quản lý Combo thiết bị",
        "maintenance_management": "Quản lý Lịch bảo trì",
        "personal_profile": "Hồ sơ cá nhân",
        "system_settings": "Cài đặt hệ thống"
    },
    'en': {
        "borrow_tools": "Borrow Study Tools",
        "lab_community": "Lab Community",
        "strategic": "Strategy",
        "strategic_management": "Strategic Management",
        "scan_qr": "Scan QR Check-in",
        "scan_qr_checkin": "Scan QR Check-in Code",
        "combos_management": "Equipment Combos",
        "maintenance_management": "Maintenance Schedule",
        "personal_profile": "Personal Profile",
        "system_settings": "System Settings"
    },
    'ja': {
        "borrow_tools": "学習ツールの貸出",
        "lab_community": "ラボコミュニティ",
        "strategic": "戦略",
        "strategic_management": "戦略管理",
        "scan_qr": "QRチェックインスキャン",
        "scan_qr_checkin": "QRチェックインコードスキャン",
        "combos_management": "機器コンボ管理",
        "maintenance_management": "メンテナンス予定管理",
        "personal_profile": "個人プロフィール",
        "system_settings": "システム設定"
    }
}

for lang, path in files.items():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for k, v in new_keys[lang].items():
        data[k] = v
        
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

