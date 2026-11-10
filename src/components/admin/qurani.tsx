"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Edit3, Plus, Minus, Loader2, Trash2, Save, X, Settings } from "lucide-react";

// Import API functions
import { fetchSettingGlobal } from "@/utils/api/setting global/fetch";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { updateSettingGlobal, updateSettingGlobalStatus } from "@/utils/api/setting global/update";
import { deleteSettingGlobal, softDeleteSettingGlobal } from "@/utils/api/setting global/delete";
import { createSettingGlobal, getNextKey } from "@/utils/api/setting global/create";

// Import types
import { SettingGlobal, EditLabelData } from "@/types/setting global";
import { useI18n } from "../providers/i18n-provider";

interface EditDialogState {
    isOpen: boolean;
    setting: SettingGlobal | null;
    formData: EditLabelData;
}

interface DeleteDialogState {
    isOpen: boolean;
    setting: SettingGlobal | null;
}

interface CreateDialogState {
    isOpen: boolean;
    type: 'sa' | 'sk';
    formData: {
        value: string;
        color: string;
        status: number;
    };
}

export default function Qurani() {
    const { t } = useI18n();

    // States
    const [settingGlobal, setSettingGlobal] = useState<SettingGlobal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSettings, setSelectedSettings] = useState<Set<number>>(new Set());

    // UI Settings States
    const [layoutType, setLayoutType] = useState("fleksibel");
    const [fontType, setFontType] = useState("IndoPak");
    const [fontSize, setFontSize] = useState(3);
    const [pageMode, setPageMode] = useState("tampilkan");

    // Initial states for change detection
    const [initialLayoutType, setInitialLayoutType] = useState("fleksibel");
    const [initialFontType, setInitialFontType] = useState("IndoPak");
    const [initialFontSize, setInitialFontSize] = useState(3);
    const [initialPageMode, setInitialPageMode] = useState("tampilkan");

    // Dialog States
    const [editDialog, setEditDialog] = useState<EditDialogState>({
        isOpen: false,
        setting: null,
        formData: { value: "", color: "", status: 1 }
    });

    const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
        isOpen: false,
        setting: null
    });

    const [createDialog, setCreateDialog] = useState<CreateDialogState>({
        isOpen: false,
        type: 'sa',
        formData: { value: "", color: "#CCCCCC", status: 1 }
    });

    // Fetch setting global data with loading (for initial load only)
    const loadSettingGlobal = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await fetchSettingGlobal();

            if (result && result.status === "success" && result.data) {
                setSettingGlobal(result.data);
                
                // Set selected settings based on active status
                const activeSettings = new Set(
                    result.data.filter(item => item.status === 1).map(item => item.id)
                );
                setSelectedSettings(activeSettings);

                // Load UI settings from database
                const layoutSetting = result.data.find(item => item.key === 'tata-letak');
                const fontSetting = result.data.find(item => item.key === 'font');
                const fontSizeSetting = result.data.find(item => item.key === 'font-size');
                const kesimpulanSetting = result.data.find(item => item.key === 'kesimpulan');

                if (layoutSetting) {
                    const layoutValue = layoutSetting.value === 'utsmani' ? 'utsmani' : 'fleksibel';
                    setLayoutType(layoutValue);
                    setInitialLayoutType(layoutValue);
                }
                if (fontSetting) {
                    const fontValue = fontSetting.value === 'Utsmani' ? 'Utsmani' : fontSetting.value === 'IndoPak' ? 'IndoPak' : 'KFGQPC';
                    setFontType(fontValue);
                    setInitialFontType(fontValue);
                }
                if (fontSizeSetting) {
                    const fontSizeValue = parseInt(fontSizeSetting.value) || 3;
                    setFontSize(fontSizeValue);
                    setInitialFontSize(fontSizeValue);
                }
                if (kesimpulanSetting) {
                    const pageModeValue = kesimpulanSetting.value === 'tampilkan' ? 'tampilkan' : 'sembunyikan';
                    setPageMode(pageModeValue);
                    setInitialPageMode(pageModeValue);
                }
            } else {
                toast.error("Gagal memuat data setting global");
            }
        } catch (error) {
            console.error("Error loading setting global:", error);
            toast.error("Terjadi kesalahan saat memuat data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Reload data without loading indicator (for after CRUD operations)
    const reloadSettingGlobal = useCallback(async () => {
        try {
            const result = await fetchSettingGlobal();

            if (result && result.status === "success" && result.data) {
                setSettingGlobal(result.data);
                
                // Set selected settings based on active status
                const activeSettings = new Set(
                    result.data.filter(item => item.status === 1).map(item => item.id)
                );
                setSelectedSettings(activeSettings);

                // Load UI settings from database
                const layoutSetting = result.data.find(item => item.key === 'tata-letak');
                const fontSetting = result.data.find(item => item.key === 'font');
                const fontSizeSetting = result.data.find(item => item.key === 'font-size');
                const kesimpulanSetting = result.data.find(item => item.key === 'kesimpulan');

                if (layoutSetting) {
                    const layoutValue = layoutSetting.value === 'utsmani' ? 'utsmani' : 'fleksibel';
                    setLayoutType(layoutValue);
                    setInitialLayoutType(layoutValue);
                }
                if (fontSetting) {
                    const fontValue = fontSetting.value === 'Utsmani' ? 'Utsmani' : fontSetting.value === 'IndoPak' ? 'IndoPak' : 'KFGQPC';
                    setFontType(fontValue);
                    setInitialFontType(fontValue);
                }
                if (fontSizeSetting) {
                    const fontSizeValue = parseInt(fontSizeSetting.value) || 3;
                    setFontSize(fontSizeValue);
                    setInitialFontSize(fontSizeValue);
                }
                if (kesimpulanSetting) {
                    const pageModeValue = kesimpulanSetting.value === 'tampilkan' ? 'tampilkan' : 'sembunyikan';
                    setPageMode(pageModeValue);
                    setInitialPageMode(pageModeValue);
                }
            }
        } catch (error) {
            console.error("Error reloading setting global:", error);
            // Silent error for reload, no toast
        }
    }, []);

    // Handle edit label
    const handleEditLabel = (setting: SettingGlobal) => {
        setEditDialog({
            isOpen: true,
            setting,
            formData: {
                key: setting.key,
                value: setting.value,
                color: setting.color || "",
                status: setting.status
            }
        });
    };

    // Handle update setting
    const handleUpdateSetting = async () => {
        if (!editDialog.setting) return;

        try {
            setIsSubmitting(true);
            const result = await updateSettingGlobal(editDialog.setting.id, editDialog.formData);

            if (result.status === "success") {
                toast.success("Setting berhasil diupdate");
                setEditDialog({ isOpen: false, setting: null, formData: { value: "", color: "", status: 1 } });
                void reloadSettingGlobal(); // Reload data without loading
            } else {
                toast.error(result.message || "Gagal mengupdate setting");
            }
        } catch (error) {
            console.error("Error updating setting:", error);
            toast.error("Terjadi kesalahan saat mengupdate setting");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete setting
    const handleDeleteSetting = async (useHardDelete = false) => {
        if (!deleteDialog.setting) return;

        try {
            setIsSubmitting(true);
            const result = useHardDelete
                ? await deleteSettingGlobal(deleteDialog.setting.id)
                : await softDeleteSettingGlobal(deleteDialog.setting.id);

            if (result.status === "success") {
                toast.success(result.message || "Setting berhasil dihapus");
                setDeleteDialog({ isOpen: false, setting: null });
                void reloadSettingGlobal(); // Reload data without loading
            } else {
                toast.error(result.message || "Gagal menghapus setting");
            }
        } catch (error) {
            console.error("Error deleting setting:", error);
            toast.error("Terjadi kesalahan saat menghapus setting");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle create new kesalahan
    const handleCreateKesalahan = (type: 'sa' | 'sk') => {
        setCreateDialog({
            isOpen: true,
            type,
            formData: { value: "", color: "#CCCCCC", status: 1 }
        });
    };

    // Handle save new kesalahan
    const handleSaveNewKesalahan = async () => {
        if (!createDialog.formData.value.trim()) {
            toast.error("Nama kesalahan tidak boleh kosong");
            return;
        }

        try {
            setIsSubmitting(true);

            // Get next available key
            const nextKey = await getNextKey(createDialog.type);

            const result = await createSettingGlobal({
                key: nextKey,
                value: createDialog.formData.value,
                color: createDialog.formData.color,
                status: createDialog.formData.status
            });

            if (result.status === "success") {
                toast.success("Kesalahan baru berhasil dibuat");
                setCreateDialog({
                    isOpen: false,
                    type: 'sa',
                    formData: { value: "", color: "#CCCCCC", status: 1 }
                });
                void reloadSettingGlobal(); // Reload data without loading
            } else {
                toast.error(result.message || "Gagal membuat kesalahan baru");
            }
        } catch (error) {
            console.error("Error creating kesalahan:", error);
            toast.error("Terjadi kesalahan saat membuat kesalahan baru");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle save settings (update status based on selection)
    const handleSaveSettings = async () => {
        const allChanges = collectAllSettingChanges();

        if (allChanges.length === 0) {
            toast.warning("Tidak ada perubahan yang perlu disimpan");
            return;
        }

        try {
            setIsSubmitting(true);

            // Update all changed settings using Promise.all for batch processing
            const updatePromises = allChanges.map(async (change) => {
                return updateSettingGlobal(change.id, {
                    key: change.key,
                    value: change.value,
                    color: change.color || "",
                    status: change.status
                });
            });

            const results = await Promise.all(updatePromises);
            const hasErrors = results.some(result => result && result.status === "error");

            if (!hasErrors) {
                // Update initial states after successful save
                setInitialLayoutType(layoutType);
                setInitialFontType(fontType);
                setInitialFontSize(fontSize);
                setInitialPageMode(pageMode);

                toast.success(`${allChanges.length} pengaturan berhasil disimpan`);
                void reloadSettingGlobal(); // Reload data without loading
            } else {
                toast.error("Beberapa pengaturan gagal disimpan");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Terjadi kesalahan saat menyimpan pengaturan");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle reset settings
    const handleResetSettings = () => {
        // Reset UI settings to initial values
        setLayoutType(initialLayoutType);
        setFontType(initialFontType);
        setFontSize(initialFontSize);
        setPageMode(initialPageMode);

        // Reset checkbox selections
        const activeSettings = new Set(
            settingGlobal.filter(item => item.status === 1).map(item => item.id)
        );
        setSelectedSettings(activeSettings);
        
        toast.info("Pengaturan direset ke nilai awal");
    };

    // Collect all setting changes
    const collectAllSettingChanges = () => {
        const changes: { id: number; key: string; value: string; color: string | null; status: number }[] = [];

        // 1. Layout changes
        if (layoutType !== initialLayoutType) {
            const layoutSetting = settingGlobal.find(item => item.key === 'tata-letak');
            if (layoutSetting) {
                changes.push({
                    id: layoutSetting.id,
                    key: 'tata-letak',
                    value: layoutType === 'utsmani' ? 'utsmani' : 'fleksibel',
                    color: null,
                    status: layoutSetting.status
                });
            }
        }

        // 2. Font Type changes
        if (fontType !== initialFontType) {
            const fontSetting = settingGlobal.find(item => item.key === 'font');
            if (fontSetting) {
                changes.push({
                    id: fontSetting.id,
                    key: 'font',
                    value: fontType,
                    color: null,
                    status: fontSetting.status
                });
            }
        }

        // 3. Font Size changes
        if (fontSize !== initialFontSize) {
            const fontSizeSetting = settingGlobal.find(item => item.key === 'font-size');
            if (fontSizeSetting) {
                changes.push({
                    id: fontSizeSetting.id,
                    key: 'font-size',
                    value: fontSize.toString(),
                    color: null,
                    status: fontSizeSetting.status
                });
            }
        }

        // 4. Page Mode changes
        if (pageMode !== initialPageMode) {
            const pageSetting = settingGlobal.find(item => item.key === 'kesimpulan');
            if (pageSetting) {
                changes.push({
                    id: pageSetting.id,
                    key: 'kesimpulan',
                    value: pageMode === 'tampilkan' ? 'tampilkan' : 'sembunyikan',
                    color: null,
                    status: pageSetting.status
                });
            }
        }

        // 5. Checkbox status changes for sa- and sk- settings
        settingGlobal
            .filter(item => item.key.startsWith('sa-') || item.key.startsWith('sk-'))
            .forEach(setting => {
                const isSelected = selectedSettings.has(setting.id);
                const currentStatus = setting.status === 1;
                if (isSelected !== currentStatus) {
                    changes.push({
                        id: setting.id,
                        key: setting.key,
                        value: setting.value,
                        color: setting.color && setting.color !== 'NULL' ? setting.color : null,
                        status: isSelected ? 1 : 0
                    });
                }
            });

        return changes;
    };

    // Load data on component mount
    useEffect(() => {
        loadSettingGlobal();
    }, [loadSettingGlobal]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                    <span className="text-gray-600 dark:text-gray-400">Memuat data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
                <Card className="bg-transparent dark:bg-transparent border-none shadow-none rounded-none py-0">
                    <CardHeader className="dark:border-gray-700 pb-2 px-0">
                        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                            {/* <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                                {t('setting global.title', 'Settings Qurani (Global)')}
                            </CardTitle> */}
                            <CardTitle className="">
                                <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                                    <div className="flex items-center justify-center">
                                    <Settings className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                                        {t('setting global.title', 'Settings Qurani (Global)')}
                                    </h1>
                                </div>
                            </CardTitle>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={() => handleCreateKesalahan('sa')}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('kelola grup.group_info.ayat_errors', 'AYAT ERRORS')}
                                </Button>
                                <Button
                                    onClick={() => handleCreateKesalahan('sk')}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t('kelola grup.group_info.word_errors', 'WORD ERRORS')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 space-y-5">
                        {/* Layout */}
                        <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-1">
                                    {t('kelola grup.group_info.layout_type', 'LAYOUT').toUpperCase()}
                                </h3>
                                <div className="flex gap-3">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="layout"
                                            value="fleksibel"
                                            checked={layoutType === "fleksibel"}
                                            onChange={(e) => setLayoutType(e.target.value)}
                                            className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{t('kelola grup.group_info.flexible', 'Flexible')}</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="layout"
                                            value="utsmani"
                                            checked={layoutType === "utsmani"}
                                            onChange={(e) => setLayoutType(e.target.value)}
                                            className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{t('kelola grup.group_info.fixed', 'Mushaf Uthmani')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Font Type */}
                        <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-1">
                                    {t('kelola grup.group_info.font_type', 'FONT TYPE').toUpperCase()}
                                </h3>
                                <Select value={fontType} onValueChange={setFontType}>
                                    <SelectTrigger className="w-56 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IndoPak">{t('kelola grup.group_info.indopak_font', 'IndoPak')}</SelectItem>
                                        <SelectItem value="Utsmani">{t('kelola grup.group_info.utsmani_font', 'Utsmani')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Font Size */}
                        <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-1">
                                    {t('kelola grup.group_info.font_size', 'FONT SIZE').toUpperCase()}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFontSize(Math.max(1, fontSize - 1))}
                                        disabled={fontSize <= 1}
                                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center justify-center w-10 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                                        <span className="text-base font-semibold text-gray-800 dark:text-gray-300">{fontSize}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFontSize(Math.min(10, fontSize + 1))}
                                        disabled={fontSize >= 10}
                                        className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* Preview Text */}
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                                    <p className="text-center text-gray-800 dark:text-gray-300" style={{ fontSize: `${fontSize * 0.3 + 1}rem` }}>
                                        بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Page Summary */}
                        <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-1">
                                    {t('kelola grup.group_info.page_mode', 'PAGE SUMMARY').toUpperCase()}
                                </h3>
                                <div className="flex gap-3">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pageMode"
                                            value="tampilkan"
                                            checked={pageMode === "tampilkan"}
                                            onChange={(e) => setPageMode(e.target.value)}
                                            className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{t('kelola grup.group_info.show', 'Show')}</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="pageMode"
                                            value="sembunyikan"
                                            checked={pageMode === "sembunyikan"}
                                            onChange={(e) => setPageMode(e.target.value)}
                                            className="w-4 h-4 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{t('kelola grup.group_info.hide', 'Hide')}</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Verse Errors & Word Errors */}
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-2">
                                    {t('kelola grup.group_info.ayat_errors', 'AYAT ERRORS')}
                                </h3>
                                <div className="space-y-1">
                                    {settingGlobal
                                        .filter(item => item.key.startsWith('sa-'))
                                        .map((setting) => (
                                            <div key={setting.id} className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={`ayat-${setting.id}`}
                                                    checked={selectedSettings.has(setting.id)}
                                                    onCheckedChange={(checked) => {
                                                        const newSelected = new Set(selectedSettings)
                                                        if (checked) {
                                                            newSelected.add(setting.id)
                                                        } else {
                                                            newSelected.delete(setting.id)
                                                        }
                                                        setSelectedSettings(newSelected)
                                                    }}
                                                    className="w-4 h-4 border-2 rounded-sm dark:data-[state=checked]:bg-blue-500 data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                />
                                                <div
                                                    className="flex items-center justify-between flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
                                                    style={{
                                                        backgroundColor: setting.color && setting.color !== 'NULL' ? setting.color : 'transparent'
                                                    }}
                                                >
                                                    <label
                                                        htmlFor={`ayat-${setting.id}`}
                                                        className="text-sm font-medium cursor-pointer flex-1 text-black"
                                                    >
                                                        {setting.value}
                                                    </label>
                                                    <div className="flex gap-1">
                                                        <button
                                                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                            onClick={() => handleEditLabel(setting)}
                                                            title="Edit label"
                                                        >
                                                            <Edit3 className="h-4 w-4 text-black" />
                                                        </button>
                                                        <button
                                                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                                            onClick={() => setDeleteDialog({ isOpen: true, setting })}
                                                            title="Delete label"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-2">
                                    {t('kelola grup.group_info.word_errors', 'WORD ERRORS')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {settingGlobal
                                        .filter(item => item.key.startsWith('sk-'))
                                        .map((setting) => (
                                            <div key={setting.id} className="flex items-center space-x-3">
                                                <Checkbox
                                                    id={`kata-${setting.id}`}
                                                    checked={selectedSettings.has(setting.id)}
                                                    onCheckedChange={(checked) => {
                                                        const newSelected = new Set(selectedSettings)
                                                        if (checked) {
                                                            newSelected.add(setting.id)
                                                        } else {
                                                            newSelected.delete(setting.id)
                                                        }
                                                        setSelectedSettings(newSelected)
                                                    }}
                                                    className="w-4 h-4 border-2 rounded-sm dark:data-[state=checked]:bg-blue-500 data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                />
                                                <div
                                                    className="flex items-center justify-between flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 transition-all hover:shadow-sm"
                                                    style={{
                                                        backgroundColor: setting.color && setting.color !== 'NULL' ? setting.color : 'transparent'
                                                    }}
                                                >
                                                    <label
                                                        htmlFor={`kata-${setting.id}`}
                                                        className="text-sm font-medium cursor-pointer flex-1 text-black"
                                                    >
                                                        {setting.value}
                                                    </label>
                                                    <div className="flex gap-1">
                                                        <button
                                                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                            onClick={() => handleEditLabel(setting)}
                                                            title="Edit label"
                                                        >
                                                            <Edit3 className="h-4 w-4 text-black" />
                                                        </button>
                                                        <button
                                                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                                                            onClick={() => setDeleteDialog({ isOpen: true, setting })}
                                                            title="Delete label"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={handleResetSettings}
                            >
                                Reset
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white dark:text-white"
                                onClick={handleSaveSettings}
                                disabled={isSubmitting || collectAllSettingChanges().length === 0}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t('kelola grup.group_info.saving', 'Saving...')}
                                    </>
                                ) : (
                                    <>{t('kelola grup.group_info.save_settings', 'Save')}</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={editDialog.isOpen} onOpenChange={(open) =>
                    setEditDialog(prev => ({ ...prev, isOpen: open }))
                }>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{t('setting global.edit_setting')}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="value" className="text-right">
                                    Label
                                </Label>
                                <Input
                                    id="value"
                                    value={editDialog.formData.value}
                                    onChange={(e) => setEditDialog(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, value: e.target.value }
                                    }))}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="color" className="text-right">
                                    {t('setting global.color')}
                                </Label>
                                <Input
                                    id="color"
                                    type="color"
                                    value={editDialog.formData.color}
                                    onChange={(e) => setEditDialog(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, color: e.target.value }
                                    }))}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select
                                    value={editDialog.formData.status.toString()}
                                    onValueChange={(value) => setEditDialog(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, status: parseInt(value) }
                                    }))}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">{t('setting global.status.active')}</SelectItem>
                                        <SelectItem value="0">{t('setting global.status.inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialog({ isOpen: false, setting: null, formData: { value: "", color: "", status: 1 } })}
                            >
                                <X className="h-4 w-4 mr-2" />
                                {t('setting global.cancel')}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleUpdateSetting}
                                disabled={isSubmitting || !editDialog.formData.value.trim()}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white dark:text-white"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {t('setting global.updating')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {t('setting global.update')}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) =>
                    setDeleteDialog(prev => ({ ...prev, isOpen: open }))
                }>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('setting global.delete_setting')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('setting global.sub_title').replace('{settingName}', deleteDialog.setting?.value || '')}
                                <br />
                                <br />
                            <strong>{t('setting global.warning')}</strong> {t('setting global.delete_warning')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t('setting global.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleDeleteSetting(true)}
                                disabled={isSubmitting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                {t('setting global.delete')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Create Kesalahan Dialog */}
                <Dialog
                    open={createDialog.isOpen}
                    onOpenChange={(open) => setCreateDialog(prev => ({ ...prev, isOpen: open }))}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {createDialog.type === 'sa' 
                                ? t('setting global.add_verse_error')
                                : t('setting global.add_word_error')}
                                
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="create-value">{t('setting global.error_name')}</Label>
                                <Input
                                    id="create-value"
                                    value={createDialog.formData.value}
                                    onChange={(e) => setCreateDialog(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, value: e.target.value }
                                    }))}
                                    placeholder={t('setting global.placeholder')}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="create-color">{t('setting global.color')}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="create-color"
                                        type="color"
                                        value={createDialog.formData.color}
                                        onChange={(e) => setCreateDialog(prev => ({
                                            ...prev,
                                            formData: { ...prev.formData, color: e.target.value }
                                        }))}
                                        className="w-16 h-10"
                                    />
                                    <Input
                                        value={createDialog.formData.color}
                                        onChange={(e) => setCreateDialog(prev => ({
                                            ...prev,
                                            formData: { ...prev.formData, color: e.target.value }
                                        }))}
                                        placeholder="#CCCCCC"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="create-status">Status</Label>
                                <Select
                                    value={createDialog.formData.status.toString()}
                                    onValueChange={(value) => setCreateDialog(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, status: parseInt(value) }
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">{t('setting global.status.active')}</SelectItem>
                                        <SelectItem value="0">{t('setting global.status.inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialog(prev => ({ ...prev, isOpen: false }))}
                            >
                                {t('setting global.cancel')}
                            </Button>
                            <Button
                                onClick={handleSaveNewKesalahan}
                                disabled={isSubmitting || !createDialog.formData.value.trim()}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white dark:text-white"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {t('setting global.save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </div>
    )
}