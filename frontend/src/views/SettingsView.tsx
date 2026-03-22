import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  loadSettings,
  saveSettings,
  type AppSettings,
} from '../models/settings';

const DURATION_OPTIONS = [
  { value: 15, label: '15秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '60秒' },
];

const THUMBNAIL_OPTIONS = [
  { value: 320, label: '小（320px）' },
  { value: 480, label: '中（480px）' },
  { value: 640, label: '大（640px）' },
];

export function SettingsView() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            onClick={() => navigate('/app')}
            className="text-gray-400 hover:text-gray-600 touch-manipulation p-3 -ml-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800 flex-1">設定</h1>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">保存しました</span>}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation font-medium"
            >
              <Save size={15} />
              保存
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        <SettingSection title="動画">
          <SettingRow label="トリミング最大長さ">
            <RadioGroup
              options={DURATION_OPTIONS}
              value={settings.videoMaxDuration}
              onChange={(v) => update('videoMaxDuration', v)}
            />
          </SettingRow>
        </SettingSection>

        <SettingSection title="画像">
          <SettingRow label="サムネイルサイズ">
            <RadioGroup
              options={THUMBNAIL_OPTIONS}
              value={settings.thumbnailMaxSize}
              onChange={(v) => update('thumbnailMaxSize', v)}
            />
          </SettingRow>
        </SettingSection>
      </div>
    </div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
        {title}
      </h2>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      {children}
    </div>
  );
}

function RadioGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-lg border touch-manipulation transition-colors ${
            value === opt.value
              ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
