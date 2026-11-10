// Interface untuk setiap objek dalam array
interface SettingGlobal {
  id: number;
  key: string;
  value: string;
  color: string | null;
  status: number;
}

interface SettingItem {
  id: number;
  value: string;
  color: string | null;
  status: boolean;
}

interface SettingUser {
  sa: SettingItem[];
  sk: SettingItem[];
  "font-size": {
    id: number;
    value: number;
    color: string | null;
    status: boolean;
  };
  kesimpulan: {
    id: number;
    value: string;
    color: string | null;
    status: boolean;
  };
  font: {
    id: number;
    value: string;
    color: string | null;
    status: boolean;
  };
  "tata-letak": {
    id: number;
    value: string;
    color: string | null;
    status: boolean;
  };
}



export type { SettingGlobal, SettingUser, SettingItem };
