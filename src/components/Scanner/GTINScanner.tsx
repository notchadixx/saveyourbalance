import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  X, 
  Barcode, 
  Search, 
  Check, 
  AlertCircle, 
  Loader2, 
  Package, 
  Plus, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { FoodItem } from '../../types';
import { fetchProductByGTIN, getFoodCategoryLabel } from '../../utils/foodBasketUtils';

interface GTINScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (item: Omit<FoodItem, 'id' | 'lastUpdated'>) => void;
}

export const GTINScanner: React.FC<GTINScannerProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [manualGtin, setManualGtin] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  
  // Состояние найденного товара
  const [scannedProduct, setScannedProduct] = useState<Partial<FoodItem> | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodQuantity, setProdQuantity] = useState('4');
  const [prodUnit, setProdUnit] = useState('шт');
  const [prodCategory, setProdCategory] = useState<FoodItem['category']>('прочее');
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'gtin-qr-reader-container';

  // Инициализация сканера камеры при открытии
  useEffect(() => {
    if (!isOpen) {
      stopCameraScanner();
      setScannedProduct(null);
      setScannerError(null);
      setManualGtin('');
      return;
    }

    // Автоматический старт камеры
    startCameraScanner();

    return () => {
      stopCameraScanner();
    };
  }, [isOpen]);

  const startCameraScanner = async () => {
    setScannerError(null);
    setIsScanning(true);

    // Даем DOM время отрисовать контейнер
    setTimeout(async () => {
      try {
        const element = document.getElementById(scannerContainerId);
        if (!element) return;

        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch {
            // ignore
          }
        }

        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            handleGtinDetected(decodedText);
          },
          () => {
            // Ошибки каждого кадра игнорируем
          }
        );
      } catch (err: any) {
        console.warn('Camera scanner init failed:', err);
        setScannerError(
          'Не удалось получить доступ к камере (возможно, нет разрешений или заблокировано в iFrame). Вы можете ввести GTIN вручную.'
        );
        setIsScanning(false);
      }
    }, 250);
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleGtinDetected = async (gtin: string) => {
    stopCameraScanner();
    setIsLoadingApi(true);
    setScannerError(null);
    setApiFeedback(null);

    const result = await fetchProductByGTIN(gtin);
    setIsLoadingApi(false);

    if (result.item) {
      setScannedProduct(result.item);
      setProdName(result.item.name || `Товар #${gtin}`);
      setProdPrice(result.item.price ? result.item.price.toString() : '');
      setProdQuantity(result.item.quantityPerMonth ? result.item.quantityPerMonth.toString() : '2');
      setProdUnit(result.item.unit || 'шт');
      setProdCategory(result.item.category || 'прочее');
      setApiFeedback(result.message || (result.success ? 'Товар успешно распознан!' : 'Товар не найден в базе'));
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualGtin.trim()) return;
    handleGtinDetected(manualGtin.trim());
  };

  const handleQuickDemoGtin = (demoCode: string, demoLabel: string) => {
    setManualGtin(demoCode);
    handleGtinDetected(demoCode);
  };

  const handleConfirmAdd = () => {
    const priceNum = parseFloat(prodPrice.replace(',', '.'));
    const qtyNum = parseFloat(prodQuantity.replace(',', '.'));

    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Пожалуйста, укажите корректную цену за единицу товара');
      return;
    }

    onAddProduct({
      name: prodName.trim() || 'Продукт',
      gtin: scannedProduct?.gtin || manualGtin || undefined,
      price: priceNum,
      quantityPerMonth: isNaN(qtyNum) || qtyNum <= 0 ? 1 : qtyNum,
      unit: prodUnit.trim() || 'шт',
      category: prodCategory,
      brand: scannedProduct?.brand,
      imageUrl: scannedProduct?.imageUrl,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--color-bg-card)] w-full max-w-md rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)]">Сканирование штрих-кода</h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">GTIN / EAN-13 и Open Food Facts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-card-subtle)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {!scannedProduct ? (
            <>
              {/* Область камеры */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[200px] flex flex-col items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full min-h-[200px]" />
                
                {isLoadingApi && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    <span className="text-xs font-medium">Поиск товара в Open Food Facts...</span>
                  </div>
                )}

                {scannerError && (
                  <div className="p-4 text-center z-10">
                    <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 max-w-xs mb-3">{scannerError}</p>
                    <button
                      onClick={startCameraScanner}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Повторить запрос камеры</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Ручной ввод штрих-кода */}
              <form onSubmit={handleManualSearch} className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                  Или введите цифры штрих-кода вручную:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Например: 4607004891234"
                      value={manualGtin}
                      onChange={(e) => setManualGtin(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl text-xs font-mono font-medium text-[var(--color-text-main)] placeholder:text-gray-400 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!manualGtin.trim() || isLoadingApi}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isLoadingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Найти</span>
                  </button>
                </div>
              </form>

              {/* Демо-коды для быстрого тестирования */}
              <div className="p-3 bg-[var(--color-bg-card-subtle)] rounded-2xl border border-[var(--color-border)]">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Примеры популярных штрих-кодов для теста:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: '4607004890693', label: 'Молоко Простоквашино' },
                    { code: '4607077610013', label: 'Макароны Макфа' },
                    { code: '4600605001425', label: 'Чай Greenfield' },
                    { code: '4606180000028', label: 'Гречка Увелка' },
                  ].map((demo) => (
                    <button
                      key={demo.code}
                      type="button"
                      onClick={() => handleQuickDemoGtin(demo.code, demo.label)}
                      className="text-[10px] font-medium px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-blue-400 text-[var(--color-text-main)] transition-colors cursor-pointer"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Экран подтверждения найденного товара */
            <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              {apiFeedback && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
                  <span>{apiFeedback}</span>
                </div>
              )}

              <div className="p-3.5 bg-[var(--color-bg-card-subtle)] rounded-2xl border border-[var(--color-border)] space-y-3">
                <div className="flex items-start gap-3">
                  {scannedProduct.imageUrl ? (
                    <img 
                      src={scannedProduct.imageUrl} 
                      alt="" 
                      className="w-14 h-14 object-cover rounded-xl border border-[var(--color-border)] shrink-0 bg-white" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Название продукта
                    </label>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Категория
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-semibold text-[var(--color-text-main)]"
                    >
                      <option value="молочка">🥛 Молочка</option>
                      <option value="хлеб">🍞 Хлеб</option>
                      <option value="мясо">🥩 Мясо и птица</option>
                      <option value="яйца">🥚 Яйца</option>
                      <option value="крупы">🌾 Крупы / Бакалея</option>
                      <option value="овощи_фрукты">🥦 Овощи и фрукты</option>
                      <option value="масло">🧈 Масло</option>
                      <option value="напитки">☕ Напитки / Чай</option>
                      <option value="прочее">🛒 Прочее</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Штрих-код (GTIN)
                    </label>
                    <div className="px-2 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-lg text-xs font-mono text-[var(--color-text-muted)] truncate">
                      {scannedProduct.gtin || '—'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Цена (₽)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="120"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Кол-во в мес
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={prodQuantity}
                      onChange={(e) => setProdQuantity(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-bold text-[var(--color-text-main)] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block mb-1">
                      Ед. изм.
                    </label>
                    <input
                      type="text"
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-xs font-medium text-[var(--color-text-main)] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Предпросмотр месячной стоимости */}
                {parseFloat(prodPrice) > 0 && parseFloat(prodQuantity) > 0 && (
                  <div className="flex justify-between items-center px-2 py-1.5 bg-emerald-500/10 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    <span>Итого в корзину в месяц:</span>
                    <span>{(parseFloat(prodPrice) * parseFloat(prodQuantity)).toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannedProduct(null);
                    startCameraScanner();
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-subtle)] transition-colors"
                >
                  Сканировать другой
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить в корзину</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
