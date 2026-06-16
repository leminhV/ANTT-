import { useTranslation } from "react-i18next";

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-[#E8F5E9] dark:bg-green-900/30 text-[#2E7D32]';
      case 'IN_USE': return 'bg-[#D6E4F7] dark:bg-blue-900/30 text-[#1E5FA5] dark:text-blue-400';
      case 'MAINTENANCE': return 'bg-[#FFF3E0] dark:bg-orange-900/30 text-[#E65100]';
      case 'BROKEN': return 'bg-[#FDEDED] dark:bg-red-900/30 text-[#C62828]';
      default: return 'bg-[#F5F5F5] dark:bg-slate-800/50 text-[#757575] dark:text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return t('status_available');
      case 'IN_USE': return t('status_in_use');
      case 'MAINTENANCE': return t('status_maintenance');
      case 'BROKEN': return t('status_broken');
      default: return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-[12px] font-medium ${getBadgeStyle(status)}`}>
      {getStatusText(status)}
    </span>
  );
}
