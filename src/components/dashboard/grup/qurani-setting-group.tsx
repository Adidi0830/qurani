"use client"

import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit3, Loader2, Minus, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { EditLabelData, SettingGlobal } from "@/types/setting global"
import { useGroupSettings, useGroupSettingsMutations } from "@/hooks/use-group-manage"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface QuraniSettingGroupProps {
    groupId: string
}

export default function QuraniSettingGroup({groupId}: QuraniSettingGroupProps) {
    const { t } = useI18n()
    const { userId } = useAuth()
    const [layoutType, setLayoutType] = useState("fleksibel")
    const [fontType, setFontType] = useState("indopak")
    const [fontSize, setFontSize] = useState(4)
    const [pageMode, setPageMode] = useState("tampilkan")
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmittingLabel, setIsSubmittingLabel] = useState(false)
    const [showEditLabelDialog, setShowEditLabelDialog] = useState(false)
    const [editingLabel, setEditingLabel] = useState<SettingGlobal | null>(null)
    const [editLabelData, setEditLabelData] = useState<EditLabelData>({
        value: '',
        color: '',
        status: 0
    })
    const [selectedSettings, setSelectedSettings] = useState<Set<number>>(new Set())

    // Simpan state asli untuk mendeteksi perubahan dan reset
    const [initialLayoutType, setInitialLayoutType] = useState("fleksibel")
    const [initialFontType, setInitialFontType] = useState("indopak")
    const [initialFontSize, setInitialFontSize] = useState(4)
    const [initialPageMode, setInitialPageMode] = useState("tampilkan")
    const [initialSelectedSettings, setInitialSelectedSettings] = useState<Set<number>>(new Set())

    const [pendingLabelChanges, setPendingLabelChanges] = useState<{ [key: number]: { value: string, color: string, status: number } }>({})

    const { settings: settingGlobal } = useGroupSettings(groupId, userId)
    const { updateSettings, resetSettings, updateLabel } = useGroupSettingsMutations(groupId, userId)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile()
    }, [])

    const fontSizeClass = useMemo(() => {
        const kaliFont = isMobile ? 5 : 6;
        let finalCalculatedPx = isMobile ? 20 : 30; // Fixed mobile font size - was 0, now 20
        let finalRealSize: number = 16;
    
        const fontSizeLabel = fontSize
    
        const parsedValue = fontSizeLabel
    
        if (!isNaN(parsedValue)) {
            finalRealSize = parsedValue;
            finalCalculatedPx = parsedValue * kaliFont;
        }
          
        return {
          px: `${finalCalculatedPx}px`,
          real: finalRealSize
        };
      }, [isMobile, fontSize]);

    // Memoize allChanges - dipanggil di render untuk button disable check
    const allChanges = useMemo(() => {
        const changes: SettingGlobal[] = []

        // 1. Perubahan Layout
        if (layoutType !== initialLayoutType) {
        const layoutSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'tata-letak')
        if (layoutSetting) {
            changes.push({
            id: layoutSetting.id,
            key: 'tata-letak',
            value: layoutType === 'utsmani' ? 'utsmani' : 'fleksibel',
            color: null,
            status: 0
            })
        }
        }

        // 2. Perubahan Font Type
        if (fontType !== initialFontType) {
        const fontSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'font')
        if (fontSetting) {
            changes.push({
            id: fontSetting.id,
            key: 'font',
            value: fontType,
            color: null,
            status: 0
            })
        }
        }

        // 3. Perubahan Font Size
        if (fontSize !== initialFontSize) {
        const fontSizeSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'font-size')
        if (fontSizeSetting) {
            changes.push({
            id: fontSizeSetting.id,
            key: 'font-size',
            value: fontSize.toString(),
            color: null,
            status: 0
            })
        }
        }

        // 4. Perubahan Page Mode
        if (pageMode !== initialPageMode) {
        const pageSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'kesimpulan')
        if (pageSetting) {
            changes.push({
            id: pageSetting.id,
            key: 'kesimpulan',
            value: pageMode === 'tampilkan' ? 'tampilkan' : 'sembunyikan',
            color: null,
            status: 0
            })
        }
        }

        // 5. Perubahan Label Kesalahan (sa- dan sk-)
        Object.entries(pendingLabelChanges).forEach(([idStr, labelChange]) => {
        const id = parseInt(idStr)
        const setting = settingGlobal.find((item: SettingGlobal) => item.id === id)
        if (setting && (setting.key.startsWith('sa-') || setting.key.startsWith('sk-'))) {
            changes.push({
            id: setting.id,
            key: setting.key,
            value: labelChange.value,
            color: labelChange.color,
            status: labelChange.status ? 1 : 0
            })
        }
        })

        // 6. Perubahan Status Checkbox (hanya untuk sa- dan sk-)
        settingGlobal
        .filter(item => item.key.startsWith('sa-') || item.key.startsWith('sk-'))
        .forEach(setting => {
            const isCurrentlySelected = selectedSettings.has(setting.id)
            const wasInitiallySelected = initialSelectedSettings.has(setting.id)

            // Jika ada perubahan status dan belum ada di pending changes
            if (isCurrentlySelected !== wasInitiallySelected && !pendingLabelChanges[setting.id]) {
            changes.push({
                id: setting.id,
                key: setting.key,
                value: setting.value || '',
                color: setting.color && setting.color !== 'NULL' ? setting.color : null,
                status: isCurrentlySelected ? 1 : 0
            })
            }
        })

        return changes
    }, [
        layoutType, initialLayoutType,
        fontType, initialFontType,
        fontSize, initialFontSize,
        pageMode, initialPageMode,
        pendingLabelChanges,
        selectedSettings, initialSelectedSettings,
        settingGlobal
    ])

    // Fungsi untuk membuka dialog edit label
    const handleEditLabel = (setting: SettingGlobal) => {
        setEditingLabel(setting)
        setEditLabelData({
        value: setting.value || '',
        color: setting.color && setting.color !== 'NULL' ? setting.color : '#ffffff',
        status: setting.status
        })
        setShowEditLabelDialog(true)
    }

    // Fungsi untuk menangani simpan perubahan setting
    const handleSaveSettings = useCallback(async () => {
        if (allChanges.length === 0) {
          toast.warning('No changes have been made')
          return
        }

        setIsSubmitting(true)
        try {
          // Prepare settings data for mutation
          const settingsData: Record<string, unknown> = {}
          
          // Map changes to settings format
          allChanges.forEach(change => {
              if (change.key === 'tata-letak') {
              settingsData.layoutType = change.value
              } else if (change.key === 'font') {
              settingsData.fontType = change.value
              } else if (change.key === 'font-size') {
              settingsData.fontSize = parseInt(change.value)
              } else if (change.key === 'kesimpulan') {
              settingsData.pageMode = change.value
              }
          })

          // Add labels if any
          const labelChanges = Object.values(pendingLabelChanges)
          if (labelChanges.length > 0) {
              settingsData.labels = labelChanges.map((change, index) => ({
              id: settingGlobal.find(item => item.key === 'error_label' && item.value === change.value)?.id || index,
              value: change.value,
              color: change.color,
              status: change.status
              }))
          }

          // Add checkbox changes for verse/word errors
          const checkboxChanges = allChanges.filter(change => 
              change.key.startsWith('sa-') || change.key.startsWith('sk-')
          )
          if (checkboxChanges.length > 0) {
              settingsData.errorLabels = checkboxChanges.map(change => ({
                  id: change.id,
                  value: change.value,
                  color: change.color,
                  status: change.status
              }))
          }

          // Use SWR mutation
          const result = await updateSettings(settingsData)

          console.log("perubahan: ", settingsData)
          
          if (result?.success) {
              toast.success(t('kelola grup.toast.settings_saved', 'Settings saved successfully'))
              
              // Update initial states to current values
              setInitialLayoutType(layoutType)
              setInitialFontType(fontType)
              setInitialFontSize(fontSize)
              setInitialPageMode(pageMode)
              setInitialSelectedSettings(new Set(selectedSettings))
              
              // Clear pending changes
              setPendingLabelChanges({})
          } else {
              throw new Error(result?.error || 'Failed to save settings')
          }
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error(t('kelola grup.toast.settings_failed', 'Failed to save changes'))
        } finally {
            setIsSubmitting(false)
        }
    }, [
        allChanges, pendingLabelChanges, settingGlobal, updateSettings, t,
        layoutType, fontType, fontSize, pageMode, selectedSettings
    ])

    // Fungsi untuk menangani reset setting
    const handleResetSettings = useCallback(async () => {
        try {
        // Use SWR mutation to reset settings
        const result = await resetSettings()
        
        if (result?.success) {
            // Reset semua nilai ke nilai awal
            setLayoutType(initialLayoutType)
            setFontType(initialFontType)
            setFontSize(initialFontSize)
            setPageMode(initialPageMode)
            setSelectedSettings(new Set(initialSelectedSettings))
            
            // Clear pending changes
            setPendingLabelChanges({})
            
            toast.success(t('kelola grup.toast.settings_reset', 'Settings and label changes have been reset successfully'))
        } else {
            throw new Error(result?.error || 'Failed to reset settings')
        }
        } catch (error) {
        console.error('Error resetting settings:', error)
        toast.error(t('kelola grup.toast.settings_reset_failed', 'Failed to reset settings'))
        }
    }, [
        resetSettings, t,
        initialLayoutType, initialFontType, initialFontSize,
        initialPageMode, initialSelectedSettings
    ])

    // Fungsi untuk handle perubahan input edit label
    const handleEditLabelInputChange = (field: 'value' | 'color', value: string) => {
      setEditLabelData(prev => ({
        ...prev,
        [field]: value
      }))
    }

    // Fungsi untuk handle perubahan checkbox status
    const handleEditLabelStatusChange = (checked: number) => {
      setEditLabelData(prev => ({
        ...prev,
        status: checked
      }))
    }

    // Fungsi untuk menutup dialog edit label
    const handleCloseEditLabelDialog = () => {
      setShowEditLabelDialog(false)
      setEditingLabel(null)
      setEditLabelData({
        value: '',
        color: '',
        status: 0
      })
    }

    // Fungsi untuk menyimpan perubahan label (temporary ke pending changes)
    const handleSaveEditLabel = useCallback(async () => {
      if (!editingLabel) return

      if (!editLabelData.value.trim()) {
        toast.error(t('kelola grup.validation.label_required', 'Label cannot be empty'))
        return
      }

      // Validate editingLabel.id is a valid number
      if (!editingLabel.id || typeof editingLabel.id !== 'number') {
        toast.error('Invalid label ID')
        return
      }

      setIsSubmittingLabel(true)
      try {
        // Debug logging
        console.log('Updating label with data:', {
          id: editingLabel.id,
          value: editLabelData.value.trim(),
          color: editLabelData.color,
          status: editLabelData.status
        })

        // Use SWR mutation to update label
        const result = await updateLabel({
          id: editingLabel.id,
          value: editLabelData.value.trim(),
          color: editLabelData.color,
          status: editLabelData.status
        })

        if (result?.success) {
          // Update selectedSettings
          const newSelectedSettings = new Set(selectedSettings)
          if (editLabelData.status) {
            newSelectedSettings.add(editingLabel.id)
          } else {
            newSelectedSettings.delete(editingLabel.id)
          }
          setSelectedSettings(newSelectedSettings)
          
          setShowEditLabelDialog(false)
          setEditingLabel(null)
          toast.success(t('kelola grup.toast.label_updated', 'Label updated successfully'))
        } else {
          throw new Error(result?.error || 'Failed to update label')
        }
      } catch (error) {
        console.error('Error updating label:', error)
        toast.error(t('kelola grup.toast.label_failed', 'Failed to update label'))
      } finally {
        setIsSubmittingLabel(false)
      }
    }, [editingLabel, editLabelData, updateLabel, selectedSettings, t])

    // Update local state when settings data changes from SWR
    useEffect(() => {
      if (settingGlobal && settingGlobal.length > 0) {
        console.log('SettingGlobal data loaded:', settingGlobal)
        // Set default values from settingGlobal
        const layoutSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'tata-letak')
        const fontSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'font')
        const fontSizeSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'font-size')
        const kesimpulanSetting = settingGlobal.find((item: SettingGlobal) => item.key === 'kesimpulan')

        if (layoutSetting) {
          const layoutValue = layoutSetting.value === 'utsmani' ? 'utsmani' : 'fleksibel'
          setLayoutType(layoutValue)
          setInitialLayoutType(layoutValue)
        }
        if (fontSetting) {
          const fontValue = fontSetting.value === 'Utsmani' ? 'Utsmani' : fontSetting.value === 'IndoPak' ? 'IndoPak' : 'KFGQPC'
          setFontType(fontValue)
          setInitialFontType(fontValue)
        }
        if (fontSizeSetting) {
          const fontSizeValue = parseInt(fontSizeSetting.value) || 5
          setFontSize(fontSizeValue)
          setInitialFontSize(fontSizeValue)
        }
        if (kesimpulanSetting) {
          const pageModeValue = kesimpulanSetting.value === 'tampilkan' ? 'tampilkan' : 'sembunyikan'
          setPageMode(pageModeValue)
          setInitialPageMode(pageModeValue)
        }

        // Simpan setting yang aktif (checked) sebagai initial state
        const activeSettings = new Set<number>(
          settingGlobal.filter((item: SettingGlobal) => item.status).map((item: SettingGlobal) => item.id)
        )
        setSelectedSettings(activeSettings)
        setInitialSelectedSettings(new Set(activeSettings))
      }
    }, [settingGlobal])
    console.log('groupid', groupId)

    return (
      <>
        <div className="space-y-7">
          {/* Layout */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                {t('kelola grup.group_info.layout_type', 'LAYOUT').toUpperCase()}
              </h3>
              <div className="flex gap-4">
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                {t('kelola grup.group_info.font_type', 'FONT TYPE').toUpperCase()}
              </h3>
              <Select value={fontType} onValueChange={setFontType}>
                <SelectTrigger className="w-64 bg-white dark:bg-slate-700 border-gray-300 dark:border-gray-600">
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                {t('kelola grup.group_info.font_size', 'FONT SIZE').toUpperCase()}
              </h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFontSize(Math.max(1, fontSize - 1))}
                  disabled={fontSize <= 1}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center w-12 h-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">{fontSize}</span>
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
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                <p className="text-center text-gray-800 dark:text-gray-300" style={{ fontSize: `${fontSizeClass.px}` }}>
                  بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                </p>
              </div>
            </div>
          </div>

          {/* Page Summary */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                {t('kelola grup.group_info.page_mode', 'PAGE SUMMARY').toUpperCase()}
              </h3>
              <div className="flex gap-4">
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
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">
                {t('kelola grup.group_info.ayat_errors', 'AYAT ERRORS')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600"
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
                        <button
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          onClick={() => handleEditLabel(setting)}
                          title="Edit label"
                        >
                          <Edit3
                            className="h-4 w-4 text-black"
                          />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4">
                {t('kelola grup.group_info.word_errors', 'WORD ERRORS')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 transition-all hover:shadow-sm"
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
                        <button
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          onClick={() => handleEditLabel(setting)}
                          title="Edit label"
                        >
                          <Edit3
                            className="h-4 w-4 text-black"
                          />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant={"outline"}
              className="transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-700 dark:text-slate-300 hover:scale-105 hover:bg-transparent"
              onClick={handleResetSettings}
            >
              Reset
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              onClick={handleSaveSettings}
              disabled={isSubmitting || allChanges.length === 0}
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
        </div>

        {/* Dialog Edit Label */}
        <Dialog open={showEditLabelDialog} onOpenChange={setShowEditLabelDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('kelola grup.mistake_labels.edit_label_title', 'Edit Error Label')}</DialogTitle>
              <DialogDescription>
                Edit the name and color of the label for {editingLabel?.key.startsWith('sa-') ? 'verse' : 'word'} errors.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-label-name">Label Name *</Label>
                <Input
                  id="edit-label-name"
                  value={editLabelData.value}
                  onChange={(e) => handleEditLabelInputChange('value', e.target.value)}
                  placeholder="Enter label name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-label-color">{t('kelola grup.mistake_labels.background_color', 'Background Color')}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="edit-label-color"
                    type="color"
                    value={editLabelData.color}
                    onChange={(e) => handleEditLabelInputChange('color', e.target.value)}
                    className="w-20 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={editLabelData.color}
                    onChange={(e) => handleEditLabelInputChange('color', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-label-status"
                    checked={!!editLabelData.status}
                    onCheckedChange={(checked) => {
                      const v = checked ? 1 : 0
                      handleEditLabelStatusChange(v)
                    }}
                    className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-sm data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  />
                  <Label htmlFor="edit-label-status" className="text-sm font-medium cursor-pointer">
                    Enable this error label for use during recitation
                  </Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 ml-6">
                  If unchecked, this label will not be used to mark errors during recitation.
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>{t('kelola grup.mistake_labels.preview', 'Preview')}</Label>
                <div
                  className="flex items-center justify-between flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600"
                  style={{
                    backgroundColor: editLabelData.color || 'transparent'
                  }}
                >
                  <span className="text-sm font-medium text-black">
                    {editLabelData.value || 'Preview label'}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseEditLabelDialog}
                disabled={isSubmittingLabel}
              >
                {t('kelola grup.mistake_labels.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSaveEditLabel}
                disabled={isSubmittingLabel}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {isSubmittingLabel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('kelola grup.mistake_labels.saving', 'Saving...')}
                  </>
                ) : (
                  t('kelola grup.mistake_labels.save_changes', 'Save Changes')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
}