// Interface untuk setiap objek dalam array
interface SettingGlobal {
  id: number;
  key: string;
  value: string;
  color: string | null;
  status: number;
}

interface EditLabelData {
  key?: string;
  value: string;
  color: string;
  status: number;
}

export type { SettingGlobal, EditLabelData };
