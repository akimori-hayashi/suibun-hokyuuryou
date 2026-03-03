'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type ExerciseIntensity = 'rest' | 'light' | 'moderate' | 'intense';
type Temperature = 'cool' | 'normal' | 'hot';

interface CalculationResult {
  basicWater: number;
  exerciseWater: number;
  totalWater: number;
  morning: number;
  noon: number;
  evening: number;
  preExercise: number;
  postExercise: number;
}

const INTENSITY_LABELS: Record<ExerciseIntensity, string> = {
  rest: '安静時',
  light: '軽い運動',
  moderate: '中程度の運動',
  intense: '激しい運動',
};

const INTENSITY_RATES: Record<ExerciseIntensity, number> = {
  rest: 0,
  light: 5,
  moderate: 8,
  intense: 12,
};

const TEMPERATURE_LABELS: Record<Temperature, string> = {
  cool: '涼しい',
  normal: '普通',
  hot: '暑い',
};

const TEMPERATURE_MULTIPLIERS: Record<Temperature, number> = {
  cool: 1.0,
  normal: 1.05,
  hot: 1.2,
};

function calculateHydration(
  weight: number,
  intensity: ExerciseIntensity,
  duration: number,
  temperature: Temperature
): CalculationResult {
  const basicWater = weight * 30;
  const exerciseWater = duration * INTENSITY_RATES[intensity];
  const multiplier = TEMPERATURE_MULTIPLIERS[temperature];
  const totalWater = Math.round((basicWater + exerciseWater) * multiplier);
  const correctedBasic = Math.round(basicWater * multiplier);
  const correctedExercise = Math.round(exerciseWater * multiplier);

  return {
    basicWater: Math.round(basicWater),
    exerciseWater: Math.round(exerciseWater),
    totalWater,
    morning: Math.round(correctedBasic * 0.25),
    noon: Math.round(correctedBasic * 0.30),
    evening: Math.round(correctedBasic * 0.25),
    preExercise:
      intensity !== 'rest' && duration > 0
        ? Math.round(correctedExercise * 0.3)
        : 0,
    postExercise:
      intensity !== 'rest' && duration > 0
        ? Math.round(correctedExercise * 0.7)
        : 0,
  };
}

function isValidIntensity(v: string): v is ExerciseIntensity {
  return Object.keys(INTENSITY_LABELS).includes(v);
}

function isValidTemperature(v: string): v is Temperature {
  return Object.keys(TEMPERATURE_LABELS).includes(v);
}

function HydrationApp() {
  const searchParams = useSearchParams();

  const initWeight = () => {
    const w = Number(searchParams.get('weight'));
    return w > 0 && w <= 300 ? w : 60;
  };

  const initIntensity = (): ExerciseIntensity => {
    const v = searchParams.get('intensity') ?? '';
    return isValidIntensity(v) ? v : 'rest';
  };

  const initDuration = () => {
    const d = Number(searchParams.get('duration'));
    return d >= 0 && d <= 480 ? d : 0;
  };

  const initTemperature = (): Temperature => {
    const v = searchParams.get('temperature') ?? '';
    return isValidTemperature(v) ? v : 'normal';
  };

  const [weight, setWeight] = useState<number>(initWeight);
  const [intensity, setIntensity] = useState<ExerciseIntensity>(initIntensity);
  const [duration, setDuration] = useState<number>(initDuration);
  const [temperature, setTemperature] = useState<Temperature>(initTemperature);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Auto-calculate if URL params are present on first load
  useEffect(() => {
    if (searchParams.has('weight')) {
      const w = initWeight();
      const i = initIntensity();
      const d = initDuration();
      const t = initTemperature();
      setResult(calculateHydration(w, i, d, t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = () => {
    if (!weight || weight <= 0 || weight > 300) {
      setValidationError('体重は1〜300kgの範囲で入力してください');
      return;
    }
    if (duration < 0 || duration > 480) {
      setValidationError('運動時間は0〜480分の範囲で入力してください');
      return;
    }
    setValidationError('');

    const calc = calculateHydration(weight, intensity, duration, temperature);
    setResult(calc);
    setExplanation('');
    setExplainError('');

    // Update URL without triggering navigation
    const params = new URLSearchParams({
      weight: weight.toString(),
      intensity,
      duration: duration.toString(),
      temperature,
    });
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  const handleExplain = async (type: 'concise' | 'detailed') => {
    if (!result) return;
    setLoadingExplain(true);
    setExplanation('');
    setExplainError('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data: {
            weight,
            intensity,
            duration,
            temperature,
            basicWater: result.basicWater,
            exerciseWater: result.exerciseWater,
            totalWater: result.totalWater,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'APIエラーが発生しました');
      }
      setExplanation(data.explanation || '解説を取得できませんでした');
    } catch (err) {
      setExplainError(
        err instanceof Error
          ? err.message
          : '解説の取得に失敗しました。しばらく待ってから再試行してください。'
      );
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleCopyUrl = async () => {
    const params = new URLSearchParams({
      weight: weight.toString(),
      intensity,
      duration: duration.toString(),
      temperature,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-8 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold sm:text-3xl mb-1">
            水分補給量計算アプリ
          </h1>
          <p className="text-blue-100 text-sm">
            体重・運動・気温から、1日に必要な水分量を計算します
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              入力情報
            </h2>
            <div className="space-y-4">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  体重（kg）
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="例: 60"
                />
              </div>

              {/* Exercise Intensity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  運動強度
                </label>
                <select
                  value={intensity}
                  onChange={(e) =>
                    setIntensity(e.target.value as ExerciseIntensity)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                >
                  {(
                    Object.entries(INTENSITY_LABELS) as [
                      ExerciseIntensity,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  運動時間（分）
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="例: 30"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  気温
                </label>
                <select
                  value={temperature}
                  onChange={(e) =>
                    setTemperature(e.target.value as Temperature)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                >
                  {(
                    Object.entries(TEMPERATURE_LABELS) as [Temperature, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {validationError && (
              <p className="text-red-500 text-sm mt-3">{validationError}</p>
            )}

            <button
              onClick={handleCalculate}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-150"
            >
              計算する
            </button>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Main Results */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    計算結果
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">
                        基本必要水分量
                      </span>
                      <span className="font-semibold text-blue-600">
                        {result.basicWater.toLocaleString()} ml
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 -mt-1 ml-0">
                      （体重 {weight}kg × 30ml）
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">
                        運動による追加量
                      </span>
                      <span className="font-semibold text-cyan-600">
                        {result.exerciseWater.toLocaleString()} ml
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 rounded-xl p-3 mt-2">
                      <span className="font-semibold text-gray-800 text-sm">
                        気温補正後の総量
                      </span>
                      <span className="text-2xl font-bold text-blue-700">
                        {result.totalWater.toLocaleString()} ml
                      </span>
                    </div>
                    {temperature !== 'cool' && (
                      <p className="text-xs text-gray-400 text-right">
                        {temperature === 'hot'
                          ? '暑い環境のため+20%補正'
                          : '普通の気温のため+5%補正'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Time-based Recommendations */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    時間帯別の推奨摂取量
                  </h2>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600 text-sm">
                        朝（起床〜午前）
                      </span>
                      <span className="font-semibold text-orange-500">
                        {result.morning.toLocaleString()} ml
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600 text-sm">
                        昼（昼食前後）
                      </span>
                      <span className="font-semibold text-yellow-600">
                        {result.noon.toLocaleString()} ml
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-600 text-sm">
                        夜（夕食〜就寝前）
                      </span>
                      <span className="font-semibold text-indigo-500">
                        {result.evening.toLocaleString()} ml
                      </span>
                    </div>
                    {intensity !== 'rest' && duration > 0 && (
                      <>
                        <div className="border-t border-gray-100 pt-2 mt-1">
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-gray-600 text-sm">
                              運動前
                            </span>
                            <span className="font-semibold text-green-600">
                              {result.preExercise.toLocaleString()} ml
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-gray-600 text-sm">
                              運動後
                            </span>
                            <span className="font-semibold text-green-600">
                              {result.postExercise.toLocaleString()} ml
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    ※ 朝・昼・夜の合計に運動前後の水分量が加わります
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-md p-6 h-48 flex items-center justify-center">
                <p className="text-gray-400 text-center text-sm leading-relaxed">
                  左のフォームに入力して
                  <br />
                  「計算する」を押してください
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Explanation */}
        {result && (
          <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 pb-2 border-b border-gray-200">
              AI解説
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              AIが計算結果を解説します。用途に合わせてお選びください。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => handleExplain('concise')}
                disabled={loadingExplain}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150"
              >
                簡潔に教えて
              </button>
              <button
                onClick={() => handleExplain('detailed')}
                disabled={loadingExplain}
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150"
              >
                詳しく教えて
              </button>
            </div>

            {loadingExplain && (
              <div className="flex items-center gap-2 text-gray-500 py-3">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0" />
                <span className="text-sm">AIが解説を作成しています...</span>
              </div>
            )}

            {explainError && !loadingExplain && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{explainError}</p>
              </div>
            )}

            {explanation && !loadingExplain && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* URL Share */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            結果を共有
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            現在の入力値をURLパラメータで共有できます。コピーしたURLを送ると、同じ条件で計算結果が表示されます。
          </p>
          <button
            onClick={handleCopyUrl}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm border transition-all duration-200 ${
              copied
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            {copied ? 'コピーしました！' : 'URLをコピー'}
          </button>
        </div>
      </main>

      <footer className="text-center text-gray-400 text-xs py-6 mt-4 border-t border-gray-100">
        <p>水分補給量計算アプリ | 健康的な水分補給を心がけましょう</p>
      </footer>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500 text-sm">読み込み中...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HydrationApp />
    </Suspense>
  );
}
