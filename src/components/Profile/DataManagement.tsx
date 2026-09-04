import React, { useState, useRef } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { useProfile } from '../../context/ProfileContext';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  FileJson, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  FileCode,
  ShieldAlert
} from 'lucide-react';
import { 
  exportBudgetDataAsJSON, 
  exportBudgetDataAsCSV, 
  validateImportedBudgetData,
  ImportValidationResult 
} from '../../utils/exportImportUtils';

interface DataManagementProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ onBack, showToast }) => {
  const { state, importBudgetState, resetToDefaults } = useBudget();
  const { profile, setProfile, resetProfile } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportValidationResult | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExportJSON = () => {
    exportBudgetDataAsJSON(state, profile);
    showToast('JSON-файл резервной копии сохранен');
  };

  const handleExportCSV = () => {
    exportBudgetDataAsCSV(state);
    showToast('CSV-таблица расходов экспортирована');
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    if (!file.name.endsWith('.json')) {
      setErrorMessage('Пожалуйста, выберите файл в формате .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        const validation = validateImportedBudgetData(json);

        if (!validation.isValid) {
          setErrorMessage(validation.error || 'Ошибка валидации структуры файла');
          setImportResult(null);
        } else {
          setImportResult(validation);
        }
      } catch (err: any) {
        setErrorMessage('Не удалось прочитать JSON-файл: ' + err.message);
        setImportResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (!importResult?.state) return;

    const res = importBudgetState(importResult.state);
    if (res.success) {
      if (importResult.profile) {
        setProfile(importResult.profile);
      }
      showToast('Данные успешно восстановлены из резервной копии');
      setImportResult(null);
      onBack();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleConfirmReset = () => {
    resetToDefaults();
    if (typeof resetProfile === 'function') {
      resetProfile();
    }
    setIsResetConfirmOpen(false);
    showToast('Все данные и настройки сброшены к начальным');
    onBack();
  };

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Экспорт данных</span>
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Сохраните данные на устройство для резервного копирования или анализа в Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportJSON}
            className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card-subtle)] hover:border-blue-500/40 text-left transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-main)] block">
                Резервная копия (JSON)
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Полный снимок бюджета и профиля
              </span>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card-subtle)] hover:border-emerald-500/40 text-left transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-main)] block">
                Таблица расходов (CSV)
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Для Excel, Google Таблиц и анализа
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-[var(--color-border)] shadow-xs space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-purple-500" />
            <span>Импорт данных</span>
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Восстановление данных из ранее сохраненного JSON-файла.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-[var(--color-border-subtle)] hover:border-purple-500/40 bg-[var(--color-bg-card-subtle)]'
          }`}
        >
          <Upload className="w-6 h-6 mx-auto text-[var(--color-text-muted)] mb-2" />
          <span className="text-xs font-bold text-[var(--color-text-main)] block">
            Нажмите или перетащите файл .json сюда
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] block mt-0.5">
            Максимальный размер: 10 МБ
          </span>
        </div>

        {/* Import Preview & Confirmation */}
        {importResult && importResult.state && (
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 space-y-3">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
              <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="text-xs font-bold">Файл валиден и готов к импорту:</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-800 dark:text-purple-300">
              <div>Период с: <b>{importResult.state.periodStartDate}</b></div>
              <div>Дней: <b>{importResult.state.days?.length || 0}</b></div>
              <div>Плановых статей: <b>{importResult.state.plannedItems?.length || 0}</b></div>
              <div>Карт / Счетов: <b>{(importResult.state.creditCards?.length || 0) + (importResult.state.bankAccounts?.length || 0)}</b></div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>Внимание: текущие данные приложения будут заменены содержимым этого файла.</span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-[var(--color-text-muted)]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                Применить импорт
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Reset Section */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 border border-rose-500/20 shadow-xs space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс настроек и данных</span>
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Сбросит все внесенные расходы, категории, привязки карт и профиль к исходным демо-данным.
          </p>
        </div>

        <button
          onClick={() => setIsResetConfirmOpen(true)}
          className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Сбросить все данные к дефолтным</span>
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                  Сбросить все данные?
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Это действие необратимо.
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)]">
              Все ваши транзакции, созданные регулярные расходы, продуктовая корзина и параметры зарплаты будут удалены.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl border text-xs font-semibold text-[var(--color-text-muted)]"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Да, сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
